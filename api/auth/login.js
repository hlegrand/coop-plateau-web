const { google } = require('googleapis');

module.exports = (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/callback`
  );

  const url = oauth2Client.generateAuthUrl({
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
