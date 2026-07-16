import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Rose } from '../components/icons.jsx';

const pct = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

function Bar({ done, total, height = 10 }) {
  const p = pct(done, total);
  return (
    <div
      style={{
        background: '#e7e4da',
        borderRadius: 999,
        height,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          background: p >= 100 ? '#5c8a4e' : '#a9821c',
          height: '100%',
          width: `${p}%`,
          transition: 'width .3s ease',
        }}
      />
    </div>
  );
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listBoards()
      .then(({ boards }) => setBoards((boards || []).filter((b) => b.kind === 'tasks')))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const done = boards.reduce((s, b) => s + (b.doneCount || 0), 0);
    const total = boards.reduce((s, b) => s + (b.taskCount || 0), 0);
    return { done, total, remaining: total - done };
  }, [boards]);

  const ranked = useMemo(
    () =>
      [...boards].sort(
        (a, b) => pct(b.doneCount, b.taskCount) - pct(a.doneCount, a.taskCount)
      ),
    [boards]
  );

  return (
    <div className="shell">
      <header>
        <div className="wordmark">
          <Rose bearing={-24} />
          Azimuth
        </div>
        <div className="who">
          <span className="dot" style={{ background: user.color }} />
          {user.name}
          <button className="btn ghost small" onClick={() => navigate('/')}>
            Boards
          </button>
        </div>
      </header>

      <h2>Dashboard</h2>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : boards.length === 0 ? (
        <p className="empty">No task boards yet. Create one to see progress here.</p>
      ) : (
        <>
          <section
            style={{
              background: '#f7f5ee',
              border: '1px solid #e3e0d5',
              borderRadius: 10,
              padding: '20px 22px',
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <strong style={{ fontSize: 16 }}>Overall progress</strong>
              <span style={{ color: '#6b6b63' }}>
                {totals.done}/{totals.total} tasks · {pct(totals.done, totals.total)}%
              </span>
            </div>
            <Bar done={totals.done} total={totals.total} height={14} />
            <div
              style={{
                display: 'flex',
                gap: 24,
                marginTop: 14,
                color: '#6b6b63',
                fontSize: 14,
              }}
            >
              <span>{totals.done} done</span>
              <span>{totals.remaining} to go</span>
              <span>
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </span>
            </div>
          </section>

          <h3 style={{ marginBottom: 12 }}>By board</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ranked.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/t/${b.id}`)}
                style={{
                  background: '#fff',
                  border: '1px solid #e3e0d5',
                  borderRadius: 8,
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{b.title}</span>
                  <span style={{ color: '#6b6b63', fontSize: 14 }}>
                    {b.doneCount}/{b.taskCount} · {pct(b.doneCount, b.taskCount)}%
                  </span>
                </div>
                <Bar done={b.doneCount} total={b.taskCount} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
