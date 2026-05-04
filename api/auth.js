const { generateAuthUrl, getTokens, getUserInfo } = require('../lib/google-oauth');
const { createUser, getUserById } = require('../lib/db');
const { createToken, requireAuth } = require('../lib/auth');

const SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'];

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth?action=callback`;

    if (action === 'login') {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'GOOGLE_CLIENT_ID non configuré' });
      }
      const url = generateAuthUrl(process.env.GOOGLE_CLIENT_ID, redirectUri, SCOPES);
      return res.redirect(url);
    }

    if (action === 'callback') {
      const { code } = req.query;
      if (!code) return res.status(400).json({ error: 'Code manquant' });

      const tokens = await getTokens(code, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
      if (tokens.error) return res.status(400).json({ error: tokens.error_description || tokens.error });

      const userInfo = await getUserInfo(tokens.access_token);
      const user = await createUser(userInfo.id, userInfo.email, userInfo.name);
      const jwt = await createToken(user);

      res.setHeader('Set-Cookie', `auth_token=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
      return res.redirect('/');
    }

    if (action === 'session') {
      const payload = await requireAuth(req, res);
      if (!payload) return;
      const user = await getUserById(payload.id);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      return res.json({ id: user.id, email: user.email, name: user.name, profile: user.profile, hasDriveTokens: !!user.google_drive_tokens });
    }

    if (action === 'logout') {
      res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0');
      return res.redirect('/');
    }

    res.status(400).json({ error: 'Action inconnue' });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: err.message });
  }
};
