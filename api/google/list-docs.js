const { requireAuth } = require('../../lib/auth');
const { getDriveTokens } = require('../../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const driveData = await getDriveTokens(user.id);
  if (!driveData?.google_drive_tokens) {
    return res.json({ files: [] });
  }

  const token = driveData.google_drive_tokens.access_token;

  try {
    const query = driveData.drive_folder_id
      ? `'${driveData.drive_folder_id}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`
      : `name contains 'Candidature' and mimeType='application/vnd.google-apps.document' and trashed=false`;

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=100`;
    const listRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await listRes.json();

    res.json({ files: data.files || [] });
  } catch (err) {
    res.json({ files: [] });
  }
};
