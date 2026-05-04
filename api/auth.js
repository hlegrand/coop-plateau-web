const { OAuth2Client } = require('google-auth-library');
const { createUser, getUserById } = require('../lib/db');
const { createToken, requireAuth } = require('../lib/auth');

module.exports = async (req, res) => {
  const action = req.query.action;
  const redirectUri = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth?action=callback`;

  if (action === 'login') {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
    const url = client.generateAuthUrl({
      access_type: 'offline', prompt: 'consent',
      scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents']
    });
    return res.redirect(url);
  }

  if (action === 'callback') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Code manquant' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
    try {
      const { tokens } = await client.getToken(code);
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userInfo = await userInfoRes.json();
      const user = await createUser(userInfo.id, userInfo.email, userInfo.name);
      const jwt = await createToken(user);
      res.setHeader('Set-Cookie', `auth_token=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
      return res.redirect('/');
    } catch (err) {
      return res.status(500).send('Erreur auth: ' + err.message);
    }
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

  res.status(400).json({ error: 'Action inconnue. Utilise ?action=login|callback|session|logout' });
};
