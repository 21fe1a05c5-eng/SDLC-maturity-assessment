import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sdlc-maturity-super-secret-key-12345';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || (user.email === 'admin@sdlc.com' ? 'admin' : 'user') },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getUserIdFromRequest(req) {
  try {
    let token = null;

    // Check Authorization: Bearer header first
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback 1: Cookies
    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    return decoded || null;
  } catch (err) {
    return null;
  }
}
