const { OAuth2Client } = require('google-auth-library');

module.exports = (req, res) => {
  const redirectUri = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/callback`;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents'
    ]
  });

  res.redirect(url);
};
