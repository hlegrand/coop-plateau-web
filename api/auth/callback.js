const { OAuth2Client } = require('google-auth-library');
const { createUser } = require('../../lib/db');
const { createToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const redirectUri = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/callback`;
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
    res.redirect('/');
  } catch (err) {
    console.error('Auth callback error:', err.message);
    res.status(500).send('Erreur authentification: ' + err.message);
  }
};
