import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Rose } from '../components/icons.jsx';

export default function Users({ user }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');

  const navigate = useNavigate();

  const load = async () => {
    try {
      const { users } = await api.listUsers();
      setPeople(users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setError('');
    setNotice('');
    if (!username.trim() || !password) {
      setError('A username and password are required.');
      return;
    }
    setBusy(true);
    try {
      await api.createUser({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
        role,
      });
      setNotice(`Added ${username.trim()}. Give them the password you just set — they can't recover it.`);
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('member');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (person) => {
    setError('');
    setNotice('');
    if (!confirm(`Remove ${person.name}? Their boards are deleted too. This can't be undone.`)) return;
    try {
      await api.deleteUser(person.id);
      setPeople((p) => p.filter((x) => x.id !== person.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="shell">
      <header>
        <button className="wordmark" onClick={() => navigate('/')} title="Back to boards">
          <Rose bearing={-24} />
          Azimuth
        </button>
        <div className="who">
          <span className="dot" style={{ background: user.color }} />
          {user.name} · superadmin
          <button className="btn ghost small" onClick={() => navigate('/')}>
            Boards
          </button>
        </div>
      </header>

      {error && <p className="error" style={{ marginTop: 20 }}>{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <h2>Add someone</h2>
      <div className="add-person">
        <div className="field">
          <label htmlFor="nu">Username</label>
          <input
            id="nu"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="jsmith"
          />
        </div>
        <div className="field">
          <label htmlFor="nd">Display name</label>
          <input
            id="nd"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jordan Smith"
          />
        </div>
        <div className="field">
          <label htmlFor="np">Password</label>
          <input
            id="np"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Set a starting password"
          />
        </div>
        <div className="field">
          <label htmlFor="nr">Role</label>
          <select id="nr" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
        <button className="btn small add-btn" onClick={add} disabled={busy}>
          {busy ? 'Adding…' : 'Add person'}
        </button>
      </div>
      <p className="fineprint">
        There's no password reset yet. To change someone's password, remove them and add them again.
      </p>

      <h2>People</h2>
      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <ul className="board-list">
          {people.map((p) => (
            <li className="board-row" key={p.id}>
              <span className="dot" style={{ background: p.color }} />
              <span className="person-name">
                {p.name}
                <span className="handle">@{p.username}</span>
              </span>
              <span className="meta">{p.role === 'superadmin' ? 'Superadmin' : 'Member'}</span>
              {p.id === user.id ? (
                <span className="meta you-tag">You</span>
              ) : (
                <button className="kill" title={`Remove ${p.name}`} onClick={() => remove(p)}>
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
