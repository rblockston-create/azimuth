import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Rose } from '../components/icons.jsx';

const ago = (iso) => {
  const mins = Math.floor((Date.now() - new Date(`${iso.replace(' ', 'T')}Z`).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

export default function Boards({ user, onSignedOut }) {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { boards } = await api.listBoards();
      setBoards(boards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      const { board } = await api.createBoard(title);
      navigate(`/b/${board.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteBoard(id);
      setBoards((b) => b.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const signOut = async () => {
    await api.logout();
    onSignedOut();
  };

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
          {user.role === 'superadmin' && ' · superadmin'}
          {user.role === 'superadmin' && (
            <button className="btn ghost small" onClick={() => navigate('/people')}>
              People
            </button>
          )}
          <button className="btn ghost small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="error" style={{ marginTop: 20 }}>{error}</p>}

      <h2>New board</h2>
      <div className="new-board">
        <input
          placeholder="What are you working out?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button className="btn small" onClick={create}>
          Create board
        </button>
      </div>

      <h2>Boards</h2>
      {loading ? (
        <p className="empty">Loading…</p>
      ) : boards.length === 0 ? (
        <p className="empty">Nothing here yet. Name a board above and start drawing.</p>
      ) : (
        <ul className="board-list">
          {boards.map((b) => (
            <li className="board-row" key={b.id}>
              <Link to={`/b/${b.id}`}>{b.title}</Link>
              <span className="meta">
                {b.shapeCount} {b.shapeCount === 1 ? 'mark' : 'marks'} · {b.ownerName} · {ago(b.updatedAt)}
              </span>
              {(b.ownerId === user.id || user.role === 'superadmin') && (
                <button className="kill" title="Delete board" onClick={() => remove(b.id)}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
