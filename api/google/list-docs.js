const { google } = require('googleapis');
const { requireAuth } = require('../../lib/auth');
const { getDriveTokens } = require('../../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const driveData = await getDriveTokens(user.id);
  if (!driveData?.google_drive_tokens) {
    return res.json({ files: [] });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(driveData.google_drive_tokens);

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const query = driveData.drive_folder_id
      ? `'${driveData.drive_folder_id}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`
      : `name contains 'Candidature' and mimeType='application/vnd.google-apps.document' and trashed=false`;

    const result = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100
    });

    res.json({ files: result.data.files || [] });
  } catch (err) {
    res.json({ files: [] });
  }
};
