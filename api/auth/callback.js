const { google } = require('googleapis');
const { createUser } = require('../../lib/db');
const { createToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const redirectUri = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/callback`;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const user = await createUser(userInfo.id, userInfo.email, userInfo.name);
    const jwt = await createToken(user);

    res.setHeader('Set-Cookie', `auth_token=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
    res.redirect('/');
  } catch (err) {
    console.error('Auth callback error:', err.message);
    res.status(500).send('Erreur authentification: ' + err.message);
  }
};
