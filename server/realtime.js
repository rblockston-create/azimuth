const { WebSocketServer } = require('ws');
const { userFromCookieHeader } = require('./auth');
const { boards, shapes, tasks } = require('./database');

// boardId -> Set<ws>
const rooms = new Map();

function join(boardId, ws) {
  if (!rooms.has(boardId)) rooms.set(boardId, new Set());
  rooms.get(boardId).add(ws);
}

function leave(boardId, ws) {
  const room = rooms.get(boardId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(boardId);
}

function broadcast(boardId, message, exclude) {
  const room = rooms.get(boardId);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client !== exclude && client.readyState === client.OPEN) client.send(payload);
  }
}

function presenceList(boardId) {
  const room = rooms.get(boardId);
  if (!room) return [];
  return [...room].map((c) => ({
    id: c.user.id,
    name: c.user.display_name,
    color: c.user.color,
  }));
}

function announcePresence(boardId) {
  broadcast(boardId, { type: 'presence', peers: presenceList(boardId) });
}

function attachRealtime(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/ws') return socket.destroy();

    const user = userFromCookieHeader(req.headers.cookie);
    const boardId = url.searchParams.get('board');
    if (!user || !boardId || !boards.get(boardId)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return socket.destroy();
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.boardId = boardId;
      wss.emit('connection', ws);
    });
  });

  wss.on('connection', (ws) => {
    const { boardId, user } = ws;
    join(boardId, ws);

    // Replay board state so the newcomer sees exactly what everyone else does.
    const board = boards.get(boardId);
    ws.send(
      JSON.stringify({
        type: 'init',
        boardId,
        kind: board.kind,
        you: { id: user.id, name: user.display_name, color: user.color, role: user.role },
        shapes: board.kind === 'tasks' ? [] : shapes.forBoard(boardId),
        tasks: board.kind === 'tasks' ? tasks.forBoard(boardId) : [],
      })
    );
    announcePresence(boardId);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      switch (msg.type) {
        // Live cursor position — not persisted, just relayed.
        case 'cursor':
          broadcast(
            boardId,
            { type: 'cursor', userId: user.id, name: user.display_name, color: user.color, x: msg.x, y: msg.y },
            ws
          );
          break;

        // A stroke/shape is finished and should be committed.
        case 'shape:add': {
          const shape = msg.shape;
          if (!shape?.id || !shape?.kind) return;
          const seq = shapes.nextSeq(boardId);
          const { id, kind, ...data } = shape;
          shapes.add({ id, boardId, authorId: user.id, kind, data, seq });
          broadcast(boardId, { type: 'shape:add', shape: { ...shape, authorId: user.id, seq } }, ws);
          break;
        }

        // In-progress stroke preview — relayed only, never written to disk.
        case 'shape:draft':
          broadcast(boardId, { type: 'shape:draft', userId: user.id, shape: msg.shape }, ws);
          break;

        case 'shape:delete': {
          const ids = Array.isArray(msg.ids) ? msg.ids : [];
          if (!ids.length) return;
          shapes.softDelete(boardId, ids);
          broadcast(boardId, { type: 'shape:delete', ids }, ws);
          break;
        }

        // Task boards: the client PATCHes via REST, then tells peers what changed.
        // The server re-reads from disk rather than trusting the payload it was handed.
        case 'task:changed': {
          const t = tasks.get(msg.taskId);
          if (t) broadcast(boardId, { type: 'task:changed', task: t }, ws);
          break;
        }

        case 'task:removed':
          if (msg.taskId) broadcast(boardId, { type: 'task:removed', taskId: msg.taskId }, ws);
          break;

        case 'task:imported':
          broadcast(boardId, { type: 'task:imported', tasks: tasks.forBoard(boardId) }, ws);
          break;

        case 'board:clear':
          if (user.role !== 'superadmin' && boards.get(boardId).owner_id !== user.id) return;
          shapes.clear(boardId);
          broadcast(boardId, { type: 'board:clear' });
          break;
      }
    });

    ws.on('close', () => {
      leave(boardId, ws);
      broadcast(boardId, { type: 'cursor:leave', userId: user.id });
      announcePresence(boardId);
    });
  });

  // Drop half-open connections so presence doesn't fill with ghosts.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}

module.exports = { attachRealtime };
