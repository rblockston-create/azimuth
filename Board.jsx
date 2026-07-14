import { useCallback, useEffect, useRef, useState } from 'react';

export function useBoardSocket(boardId) {
  const [status, setStatus] = useState('connecting'); // connecting | live | offline
  const [shapes, setShapes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [cursors, setCursors] = useState({});
  const [peers, setPeers] = useState([]);

  const ws = useRef(null);
  const retry = useRef(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!boardId) return;
    let closed = false;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${proto}://${location.host}/ws?board=${boardId}`);
      ws.current = socket;

      socket.onopen = () => {
        attempts.current = 0;
        setStatus('live');
      };

      socket.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case 'init':
            setShapes(msg.shapes);
            break;
          case 'shape:add':
            setShapes((prev) => [...prev, msg.shape]);
            setDrafts((d) => ({ ...d, [msg.shape.authorId]: null }));
            break;
          case 'shape:draft':
            setDrafts((d) => ({ ...d, [msg.userId]: msg.shape }));
            break;
          case 'shape:delete': {
            const gone = new Set(msg.ids);
            setShapes((prev) => prev.filter((s) => !gone.has(s.id)));
            break;
          }
          case 'board:clear':
            setShapes([]);
            setDrafts({});
            break;
          case 'presence':
            setPeers(msg.peers);
            break;
          case 'cursor':
            setCursors((c) => ({
              ...c,
              [msg.userId]: { name: msg.name, color: msg.color, x: msg.x, y: msg.y },
            }));
            break;
          case 'cursor:leave':
            setCursors((c) => {
              const next = { ...c };
              delete next[msg.userId];
              return next;
            });
            setDrafts((d) => {
              const next = { ...d };
              delete next[msg.userId];
              return next;
            });
            break;
          default:
            break;
        }
      };

      socket.onclose = () => {
        if (closed) return;
        setStatus('offline');
        // Back off, but keep trying — Render free instances nap.
        const delay = Math.min(8000, 500 * 2 ** attempts.current++);
        retry.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(retry.current);
      ws.current?.close();
    };
  }, [boardId]);

  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  // Optimistic local application, then broadcast. The server echoes to everyone else.
  const commit = useCallback(
    (shape) => {
      setShapes((prev) => [...prev, shape]);
      send({ type: 'shape:add', shape });
    },
    [send]
  );

  const erase = useCallback(
    (ids) => {
      const gone = new Set(ids);
      setShapes((prev) => prev.filter((s) => !gone.has(s.id)));
      send({ type: 'shape:delete', ids });
    },
    [send]
  );

  const draft = useCallback((shape) => send({ type: 'shape:draft', shape }), [send]);

  const clear = useCallback(() => {
    setShapes([]);
    send({ type: 'board:clear' });
  }, [send]);

  const cursor = useCallback((x, y) => {
    if (x === null) return;
    send({ type: 'cursor', x, y });
  }, [send]);

  return { status, shapes, drafts, cursors, peers, commit, erase, draft, clear, cursor };
}
