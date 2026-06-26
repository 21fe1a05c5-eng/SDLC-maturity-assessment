import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

    // Check Authorization: Bearer header first (specific to the tab context)
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } catch (_) {}

    // Fallback 1: Next.js cookies() store
    if (!token) {
      try {
        const cookieStore = cookies();
        token = cookieStore.get('token')?.value || null;
      } catch (_) {}
    }

    // Fallback 2: manual header cookie parsing
    if (!token) {
      try {
        const cookieHeader = req.headers.get('cookie') || '';
        const cookieMap = {};
        cookieHeader.split(';').forEach(c => {
          const eqIdx = c.indexOf('=');
          if (eqIdx > -1) {
            cookieMap[c.slice(0, eqIdx).trim()] = c.slice(eqIdx + 1).trim();
          }
        });
        token = cookieMap['token'] || null;
      } catch (_) {}
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    return decoded || null;
  } catch (err) {
    return null;
  }
}
