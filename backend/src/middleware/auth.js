import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authRequired(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded = verifyToken(token);
  if (!decoded?.userId) return res.status(401).json({ error: 'Invalid token' });
  req.user = { id: decoded.userId, role: decoded.role };
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

/** Admin or Director (same privilege tier for analytics). */
export function directorAccess(req, res, next) {
  const r = req.user?.role;
  if (r !== 'admin' && r !== 'director') {
    return res.status(403).json({ error: 'Director or admin only' });
  }
  next();
}
