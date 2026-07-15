import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Boards from './pages/Boards.jsx';
import Board from './pages/Board.jsx';
import Users from './pages/Users.jsx';
import TaskBoard from './pages/TaskBoard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  if (!user) return <Login onSignedIn={setUser} />;

  return (
    <Routes>
      <Route path="/" element={<Boards user={user} onSignedOut={() => setUser(null)} />} />
      <Route path="/b/:id" element={<Board user={user} />} />
      <Route path="/t/:id" element={<TaskBoard user={user} />} />
      {user.role === 'superadmin' && <Route path="/people" element={<Users user={user} />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
