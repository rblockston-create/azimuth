async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body is fine */
  }

  if (!res.ok) {
    throw new Error(payload?.error || 'Something went wrong. Try again.');
  }
  return payload;
}

export const api = {
  me: () => request('GET', '/api/me'),
  login: (username, password) => request('POST', '/api/login', { username, password }),
  logout: () => request('POST', '/api/logout'),

  listBoards: () => request('GET', '/api/boards'),
  createBoard: (title, kind = 'canvas') => request('POST', '/api/boards', { title, kind }),
  getBoard: (id) => request('GET', `/api/boards/${id}`),
  renameBoard: (id, title) => request('PATCH', `/api/boards/${id}`, { title }),
  deleteBoard: (id) => request('DELETE', `/api/boards/${id}`),

  listTasks: (boardId) => request('GET', `/api/boards/${boardId}/tasks`),
  createTask: (boardId, task) => request('POST', `/api/boards/${boardId}/tasks`, task),
  importTasks: (boardId, tasks) => request('POST', `/api/boards/${boardId}/tasks/import`, { tasks }),
  updateTask: (taskId, patch) => request('PATCH', `/api/tasks/${taskId}`, patch),
  deleteTask: (taskId) => request('DELETE', `/api/tasks/${taskId}`),

  listUsers: () => request('GET', '/api/users'),
  createUser: (payload) => request('POST', '/api/users', payload),
  deleteUser: (id) => request('DELETE', `/api/users/${id}`),
};
