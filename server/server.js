const path = require('path');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const { customAlphabet } = require('nanoid');

const { users, sessions, boards, shapes } = require('./database');
const {
  newToken,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireAuth,
  requireSuperadmin,
} = require('./auth');
const { attachRealtime } = require('./realtime');

const boardId = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);

const app = express();
app.set('trust proxy', 1); // Render terminates TLS upstream
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.display_name,
  role: u.role,
  color: u.color,
});

// ---------- auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Enter a username and password.' });
  }
  const user = users.byUsername(username.trim());
  if (!user || !users.verify(user, password)) {
    return res.status(401).json({ error: 'That username and password don\'t match.' });
  }
  const token = newToken();
  sessions.create(token, user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies?.azimuth_session;
  if (token) sessions.destroy(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

// ---------- boards ----------
app.get('/api/boards', requireAuth, (req, res) => {
  res.json({
    boards: boards.list().map((b) => ({
      id: b.id,
      title: b.title,
      ownerId: b.owner_id,
      ownerName: b.owner_name,
      shapeCount: b.shape_count,
      updatedAt: b.updated_at,
    })),
  });
});

app.post('/api/boards', requireAuth, (req, res) => {
  const title = (req.body?.title || '').trim() || 'Untitled board';
  const board = boards.create({ id: boardId(), title, ownerId: req.user.id });
  res.status(201).json({ board: { id: board.id, title: board.title, ownerId: board.owner_id } });
});

app.get('/api/boards/:id', requireAuth, (req, res) => {
  const board = boards.get(req.params.id);
  if (!board) return res.status(404).json({ error: 'That board no longer exists.' });
  res.json({
    board: { id: board.id, title: board.title, ownerId: board.owner_id },
    shapes: shapes.forBoard(board.id),
  });
});

app.patch('/api/boards/:id', requireAuth, (req, res) => {
  const board = boards.get(req.params.id);
  if (!board) return res.status(404).json({ error: 'That board no longer exists.' });
  if (board.owner_id !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only the board owner can rename it.' });
  }
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Give the board a name.' });
  boards.rename(board.id, title);
  res.json({ ok: true });
});

app.delete('/api/boards/:id', requireAuth, (req, res) => {
  const board = boards.get(req.params.id);
  if (!board) return res.status(404).json({ error: 'That board no longer exists.' });
  if (board.owner_id !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only the board owner can delete it.' });
  }
  boards.remove(board.id);
  res.json({ ok: true });
});

// ---------- users (superadmin) ----------
app.get('/api/users', requireSuperadmin, (_req, res) => {
  res.json({ users: users.all().map((u) => ({ ...u, name: u.display_name })) });
});

app.post('/api/users', requireSuperadmin, (req, res) => {
  const { username, displayName, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (users.byUsername(username.trim())) {
    return res.status(409).json({ error: 'That username is taken.' });
  }
  const user = users.create({
    username: username.trim(),
    displayName,
    password,
    role: role === 'superadmin' ? 'superadmin' : 'member',
  });
  res.status(201).json({ user: publicUser(user) });
});

app.delete('/api/users/:id', requireSuperadmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You can\'t remove your own account.' });
  }
  users.remove(id);
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- static client ----------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const server = http.createServer(app);
attachRealtime(server);

setInterval(() => sessions.prune(), 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Azimuth listening on ${PORT}`));
