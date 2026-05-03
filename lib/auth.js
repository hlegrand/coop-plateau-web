const { SignJWT, jwtVerify } = require('jose');

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');

async function createToken(user) {
  return new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/auth_token=([^;]+)/);
  if (match) return match[1];

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

async function requireAuth(req, res) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Non connecté' });
    return null;
  }
  const user = await verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expirée' });
    return null;
  }
  return user;
}

module.exports = { createToken, verifyToken, getTokenFromRequest, requireAuth };
