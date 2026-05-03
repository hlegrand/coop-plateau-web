const { requireAuth } = require('../../lib/auth');
const { getDriveTokens } = require('../../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const driveData = await getDriveTokens(user.id);
  res.json({
    hasCredentials: !!process.env.GOOGLE_CLIENT_ID,
    hasToken: !!driveData?.google_drive_tokens,
    ready: !!process.env.GOOGLE_CLIENT_ID && !!driveData?.google_drive_tokens
  });
};
