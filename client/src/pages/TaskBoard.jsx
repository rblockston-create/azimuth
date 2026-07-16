import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Rose } from '../components/icons.jsx';

const COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];

const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
};

export default function TaskBoard({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('connecting');
  const [peers, setPeers] = useState([]);
  const [category, setCategory] = useState('All');
  const [dragId, setDragId] = useState(null);
  const [dropCol, setDropCol] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [taskBoards, setTaskBoards] = useState([]);

  const ws = useRef(null);

  // ---------- load ----------
  useEffect(() => {
    api
      .getBoard(id)
      .then(({ board, tasks: t }) => {
        if (board.kind !== 'tasks') {
          navigate(`/b/${board.id}`, { replace: true });
          return;
        }
        setTitle(board.title);
        setTasks(t || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // list of task boards, for the "move to board" selector in the editor
  useEffect(() => {
    api
      .listBoards()
      .then(({ boards }) => setTaskBoards((boards || []).filter((b) => b.kind === 'tasks')))
      .catch(() => {});
  }, []);

  // ---------- realtime ----------
  useEffect(() => {
    let closed = false;
    let retry;
    let attempts = 0;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${proto}://${location.host}/ws?board=${id}`);
      ws.current = socket;

      socket.onopen = () => {
        attempts = 0;
        setStatus('live');
      };

      socket.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init') setTasks(msg.tasks || []);
        if (msg.type === 'presence') setPeers(msg.peers);
        if (msg.type === 'task:changed') {
          setTasks((prev) => {
            const i = prev.findIndex((t) => t.id === msg.task.id);
            if (i === -1) return [...prev, msg.task];
            const next = [...prev];
            next[i] = msg.task;
            return next;
          });
        }
        if (msg.type === 'task:removed') setTasks((p) => p.filter((t) => t.id !== msg.taskId));
        if (msg.type === 'task:imported') setTasks(msg.tasks);
      };

      socket.onclose = () => {
        if (closed) return;
        setStatus('offline');
        retry = setTimeout(connect, Math.min(8000, 500 * 2 ** attempts++));
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws.current?.close();
    };
  }, [id]);

  const tell = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg));
  }, []);

  // ---------- mutations (optimistic, then tell peers) ----------
  const patchTask = async (taskId, patch) => {
    const before = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    try {
      const { task } = await api.updateTask(taskId, patch);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
      tell({ type: 'task:changed', taskId });
    } catch (err) {
      setTasks(before); // roll back rather than leave a lie on screen
      setError(err.message);
    }
  };

  const removeTask = async (taskId) => {
    const before = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
      tell({ type: 'task:removed', taskId });
    } catch (err) {
      setTasks(before);
      setError(err.message);
    }
  };

  // Move a task to a different board. It leaves this board's list; the
  // destination board picks it up on its next load.
  const moveTask = async (taskId, patch) => {
    const before = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.updateTask(taskId, patch);
      tell({ type: 'task:removed', taskId });
    } catch (err) {
      setTasks(before);
      setError(err.message);
    }
  };

  // Create a task from the composer modal. Mirrors the fields the editor saves,
  // so anything typed here (owner, dates, notes, blockers) is persisted too.
  const addTask = async (status, fields) => {
    const name = fields.title.trim();
    if (!name) return;
    try {
      const { task } = await api.createTask(id, {
        ...fields,
        title: name,
        status,
        category: fields.category || (category === 'All' ? '' : category),
        targetDate: fields.targetDate || null,
      });
      setTasks((prev) => [...prev, task]);
      tell({ type: 'task:changed', taskId: task.id });
    } catch (err) {
      setError(err.message);
    }
  };

  const saveTitle = async () => {
    if (!title.trim()) return;
    try {
      await api.renameBoard(id, title.trim());
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------- derived ----------
  const categories = useMemo(() => {
    const set = [...new Set(tasks.map((t) => t.category).filter(Boolean))];
    return ['All', ...set];
  }, [tasks]);

  const visible = useMemo(
    () => (category === 'All' ? tasks : tasks.filter((t) => t.category === category)),
    [tasks, category]
  );

  const byColumn = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    for (const t of visible) (map[t.status] || map.todo).push(t);
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.position - b.position);
    return map;
  }, [visible]);

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  if (error && loading) {
    return (
      <div className="shell">
        <p className="error">{error}</p>
        <button className="btn ghost small" onClick={() => navigate('/')}>Back to boards</button>
      </div>
    );
  }

  return (
    <div className="taskboard">
      <div className="board-bar">
        <button className="back" title="Back to boards" onClick={() => navigate('/')}>←</button>

        <input
          className="board-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          aria-label="Board name"
        />

        <span className="progress-tag">
          {doneCount}/{tasks.length} done
        </span>

        <div className="peers">
          {peers.map((p) => (
            <div key={p.id} className="peer" style={{ background: p.color }} title={p.name}>
              {p.name[0].toUpperCase()}
            </div>
          ))}
        </div>

        <div className="link-state">
          <span
            className="dot"
            style={{ background: status === 'live' ? '#5c8a4e' : status === 'offline' ? '#b0544c' : '#c8963e' }}
          />
          {status === 'live' ? 'Live' : status === 'offline' ? 'Reconnecting' : 'Connecting'}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="cat-tabs">
          {categories.map((c) => (
            <button
              key={c}
              className="cat-tab"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
              <span className="cat-count">
                {c === 'All' ? tasks.length : tasks.filter((t) => t.category === c).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && !loading && <p className="error board-error">{error}</p>}

      {loading ? (
        <p className="empty" style={{ padding: 40 }}>Loading…</p>
      ) : (
        <div className="columns">
          {COLUMNS.map((col) => (
            <section
              key={col.id}
              className={`column${dropCol === col.id ? ' over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDropCol(col.id);
              }}
              onDragLeave={() => setDropCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setDropCol(null);
                if (dragId) {
                  const t = tasks.find((x) => x.id === dragId);
                  if (t && t.status !== col.id) patchTask(dragId, { status: col.id });
                }
                setDragId(null);
              }}
            >
              <header className={`col-head ${col.id}`}>
                <span>{col.label}</span>
                <span className="col-count">{byColumn[col.id].length}</span>
              </header>

              <div className="col-body">
                <button className="add-card" onClick={() => setAdding(col.id)}>
                  + Add task
                </button>

                {byColumn[col.id].map((t) => (
                  <article
                    key={t.id}
                    className={`card${dragId === t.id ? ' dragging' : ''}${t.status === 'done' ? ' done' : ''}${
                      t.status !== 'done' && t.targetDate && t.targetDate < today() ? ' overdue' : ''
                    }`}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onDoubleClick={() => setEditing(t)}
                  >
                    <div className="card-top">
                      <button
                        className="check"
                        aria-pressed={t.status === 'done'}
                        title={t.status === 'done' ? 'Reopen' : 'Mark done'}
                        onClick={() => patchTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' })}
                      >
                        {t.status === 'done' ? '✓' : ''}
                      </button>
                      <p className="card-title">{t.title}</p>
                      <button className="kill" title="Delete task" onClick={() => removeTask(t.id)}>✕</button>
                    </div>

                    {t.group && <p className="card-group">{t.group}</p>}

                    <div className="card-meta">
                      {t.owner && <span className="chip owner">{t.owner}</span>}
                      {t.cost != null && t.cost !== '' && (
                        <span className="chip cost">${Number(t.cost).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      )}
                      {t.targetDate && (
                        <span
                          className={`chip date${
                            t.status !== 'done' && t.targetDate < today() ? ' overdue' : ''
                          }`}
                        >
                          {fmtDate(t.targetDate)}
                        </span>
                      )}
                      {t.blockers && (
                        <span className="chip blocker" title={t.blockers}>
                          ⚠ blocked by
                        </span>
                      )}
                      {t.notes && (
                        <span className="chip note" title={t.notes}>
                          ≡ notes
                        </span>
                      )}
                    </div>

                    {t.blockers && <p className="card-blockers">{t.blockers}</p>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <TaskEditor
          task={editing}
          boards={taskBoards}
          currentBoardId={id}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (patch.boardId && patch.boardId !== id) moveTask(editing.id, patch);
            else patchTask(editing.id, patch);
            setEditing(null);
          }}
        />
      )}

      {adding && (
        <TaskComposer
          defaultCategory={category === 'All' ? '' : category}
          onClose={() => setAdding(null)}
          onSave={(fields) => {
            addTask(adding, fields);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function TaskEditor({ task, onClose, onSave, boards = [], currentBoardId }) {
  const [form, setForm] = useState({
    title: task.title,
    group: task.group || '',
    category: task.category || '',
    owner: task.owner || '',
    targetDate: task.targetDate || '',
    blockers: task.blockers || '',
    notes: task.notes || '',
    costItems: (
      task.costItems && task.costItems.length
        ? task.costItems
        : task.cost != null
        ? [{ price: task.cost }]
        : []
    ).map((it) => ({
      label: it.label || '',
      quantity: it.quantity != null ? it.quantity : 1,
      price: it.price != null ? it.price : it.amount != null ? it.amount : '',
    })),
    boardId: currentBoardId,
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const items = form.costItems;
  const setItems = (next) => setForm({ ...form, costItems: next });
  const updateItem = (i, key, val) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const addItem = () => setItems([...items, { label: '', quantity: 1, price: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const lineTotal = (it) => (Number(it.quantity) || 0) * (Number(it.price) || 0);
  const total = items.reduce((s, it) => s + lineTotal(it), 0);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Edit task</h3>

        <div className="field">
          <label htmlFor="t-title">Task</label>
          <input id="t-title" value={form.title} onChange={set('title')} autoFocus />
        </div>

        {boards.length > 1 && (
          <div className="field">
            <label htmlFor="t-board">Board</label>
            <select id="t-board" value={form.boardId} onChange={set('boardId')}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sheet-row">
          <div className="field">
            <label htmlFor="t-cat">Category</label>
            <input id="t-cat" value={form.category} onChange={set('category')} />
          </div>
          <div className="field">
            <label htmlFor="t-grp">Group</label>
            <input id="t-grp" value={form.group} onChange={set('group')} />
          </div>
        </div>

        <div className="sheet-row">
          <div className="field">
            <label htmlFor="t-owner">Owner</label>
            <input id="t-owner" value={form.owner} onChange={set('owner')} placeholder="Angela" />
          </div>
          <div className="field">
            <label htmlFor="t-date">Target date</label>
            <input id="t-date" type="date" value={form.targetDate} onChange={set('targetDate')} />
          </div>
        </div>

        <div className="field">
          <label>Cost line items</label>
          {items.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                fontSize: 11,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: '#8a8f84',
                marginBottom: 4,
              }}
            >
              <span style={{ flex: 1 }}>Item needed</span>
              <span style={{ width: 60 }}>Qty</span>
              <span style={{ width: 92 }}>Price</span>
              <span style={{ width: 92, textAlign: 'right' }}>Total</span>
              <span style={{ width: 22 }} />
            </div>
          )}
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <input
                style={{ flex: 1 }}
                placeholder="Item needed"
                value={it.label}
                onChange={(e) => updateItem(i, 'label', e.target.value)}
              />
              <input
                style={{ width: 60 }}
                type="number"
                min="0"
                step="1"
                placeholder="1"
                value={it.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
              />
              <input
                style={{ width: 92 }}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={it.price}
                onChange={(e) => updateItem(i, 'price', e.target.value)}
              />
              <span style={{ width: 92, textAlign: 'right', color: '#6b6b63' }}>
                ${lineTotal(it).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                className="kill"
                title="Remove line item"
                onClick={() => removeItem(i)}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn ghost small" onClick={addItem}>
            + Add line item
          </button>
          <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 600 }}>
            Total: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="t-notes">Notes</label>
          <textarea id="t-notes" rows={4} value={form.notes} onChange={set('notes')} />
        </div>

        <div className="field">
          <label htmlFor="t-block">Blocked by</label>
          <textarea id="t-block" rows={3} value={form.blockers} onChange={set('blockers')} />
        </div>

        <div className="sheet-actions">
          <button className="btn ghost small" onClick={onClose}>Cancel</button>
          <button
            className="btn small"
            onClick={() => {
              const clean = form.costItems
                .map((it) => ({
                  label: (it.label || '').trim(),
                  quantity: Number(it.quantity) || 0,
                  price: Number(it.price) || 0,
                }))
                .filter((it) => it.label || it.price);
              const sum = clean.reduce((s, it) => s + it.quantity * it.price, 0);
              onSave({ ...form, targetDate: form.targetDate || null, costItems: clean, cost: clean.length ? sum : null });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Add task. Same sheet markup as TaskEditor so it matches the edit modal exactly,
// but starts empty and creates a new task instead of patching one.
function TaskComposer({ onClose, onSave, defaultCategory }) {
  const [form, setForm] = useState({
    title: '',
    group: '',
    category: defaultCategory || '',
    owner: '',
    targetDate: '',
    blockers: '',
    notes: '',
    cost: '',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const canSave = form.title.trim().length > 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Add task</h3>

        <div className="field">
          <label htmlFor="n-title">Task</label>
          <input id="n-title" value={form.title} onChange={set('title')} autoFocus />
        </div>

        <div className="sheet-row">
          <div className="field">
            <label htmlFor="n-cat">Category</label>
            <input id="n-cat" value={form.category} onChange={set('category')} />
          </div>
          <div className="field">
            <label htmlFor="n-grp">Group</label>
            <input id="n-grp" value={form.group} onChange={set('group')} />
          </div>
        </div>

        <div className="sheet-row">
          <div className="field">
            <label htmlFor="n-owner">Owner</label>
            <input id="n-owner" value={form.owner} onChange={set('owner')} placeholder="Angela" />
          </div>
          <div className="field">
            <label htmlFor="n-date">Target date</label>
            <input id="n-date" type="date" value={form.targetDate} onChange={set('targetDate')} />
          </div>
        </div>

        <div className="sheet-row">
          <div className="field">
            <label htmlFor="n-cost">Cost ($)</label>
            <input
              id="n-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={set('cost')}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="n-notes">Notes</label>
          <textarea id="n-notes" rows={4} value={form.notes} onChange={set('notes')} />
        </div>

        <div className="field">
          <label htmlFor="n-block">Blocked by</label>
          <textarea id="n-block" rows={3} value={form.blockers} onChange={set('blockers')} />
        </div>

        <div className="sheet-actions">
          <button className="btn ghost small" onClick={onClose}>Cancel</button>
          <button
            className="btn small"
            disabled={!canSave}
            onClick={() => onSave({ ...form, targetDate: form.targetDate || null, cost: form.cost === '' ? null : Number(form.cost) })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
