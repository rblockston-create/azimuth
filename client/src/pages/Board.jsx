import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useBoardSocket } from '../useBoardSocket.js';
import Canvas from '../components/Canvas.jsx';
import Toolbar, { INKS, WIDTHS } from '../components/Toolbar.jsx';
import { Rose } from '../components/icons.jsx';

const KEYS = { p: 'pen', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', t: 'text', e: 'eraser' };

// The signature readout: pan offset expressed as a compass bearing from origin.
function bearingOf(x, y) {
  const deg = (Math.atan2(x, -y) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

export default function Board({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState(null);
  const [error, setError] = useState('');

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(INKS[0]);
  const [width, setWidth] = useState(WIDTHS[0]);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });

  const mine = useRef([]);
  const { status, shapes, drafts, cursors, peers, commit, erase, draft, clear, cursor } = useBoardSocket(id);

  useEffect(() => {
    api
      .getBoard(id)
      .then(({ board }) => {
        setTitle(board.title);
        setOwnerId(board.ownerId);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // Tool shortcuts + undo of your own last mark.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const last = mine.current.pop();
        if (last) erase([last]);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const next = KEYS[e.key.toLowerCase()];
      if (next) setTool(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [erase]);

  const handleCommit = (shape) => {
    mine.current.push(shape.id);
    commit(shape);
  };

  const handleErase = (ids) => {
    mine.current = mine.current.filter((sid) => !ids.includes(sid));
    erase(ids);
  };

  const saveTitle = async () => {
    const next = title.trim();
    if (!next) return;
    try {
      await api.renameBoard(id, next);
    } catch (err) {
      setError(err.message);
    }
  };

  const canClear = user.role === 'superadmin' || ownerId === user.id;
  const bearing = bearingOf(view.x, view.y);
  const range = Math.round(Math.hypot(view.x, view.y));

  if (error) {
    return (
      <div className="shell">
        <p className="error">{error}</p>
        <button className="btn ghost small" onClick={() => navigate('/')}>
          Back to boards
        </button>
      </div>
    );
  }

  return (
    <div className="board">
      <div className="board-bar">
        <button className="back" title="Back to boards" onClick={() => navigate('/')}>
          ←
        </button>

        <input
          className="board-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          aria-label="Board name"
        />

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

      <div className="stage">
        <Canvas
          shapes={shapes}
          drafts={drafts}
          cursors={cursors}
          tool={tool}
          color={color}
          width={width}
          view={view}
          setView={setView}
          onCommit={handleCommit}
          onDraft={draft}
          onErase={handleErase}
          onCursor={cursor}
        />

        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          width={width}
          setWidth={setWidth}
          canClear={canClear}
          onClear={clear}
        />

        <div className="bearing">
          <Rose className="rose-lg" bearing={bearing} />
          <dl>
            <dt>Bearing</dt>
            <dd>{String(bearing).padStart(3, '0')}°</dd>
            <dt>Range</dt>
            <dd>{range}</dd>
            <dt>Scale</dt>
            <dd>{Math.round(view.scale * 100)}%</dd>
          </dl>
          <button
            className="reset"
            title="Return to origin"
            onClick={() => setView({ x: 0, y: 0, scale: 1 })}
          >
            ⊕
          </button>
        </div>

        <div className="hint">Space or middle-drag to pan · scroll to zoom · ⌘Z to undo</div>
      </div>
    </div>
  );
}
