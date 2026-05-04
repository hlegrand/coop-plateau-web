function getUserFromRequest(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/auth_user=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

async function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Non connecté' });
    return null;
  }
  return user;
}

module.exports = { getUserFromRequest, requireAuth };
