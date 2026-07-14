const crypto = require('crypto');
const { sessions } = require('./database');

const COOKIE = 'azimuth_session';

const newToken = () => crypto.randomBytes(32).toString('hex');

function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE);
}

// Resolves the user from the session cookie, if any. Never rejects.
function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  req.user = token ? sessions.get(token) || null : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  next();
}

function requireSuperadmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'This action is limited to superadmins.' });
  }
  next();
}

// Used by the WebSocket upgrade path, which has a raw cookie header, not req.cookies.
function userFromCookieHeader(header = '') {
  const match = header.split(';').map((c) => c.trim().split('='))
    .find(([k]) => k === COOKIE);
  return match ? sessions.get(decodeURIComponent(match[1])) || null : null;
}

module.exports = {
  COOKIE,
  newToken,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireAuth,
  requireSuperadmin,
  userFromCookieHeader,
};
