const { OAuth2Client } = require('google-auth-library');
const { requireAuth } = require('../lib/auth');
const { getDriveTokens } = require('../lib/db');

module.exports = async (req, res) => {
  const action = req.query.action;

  if (action === 'status') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const driveData = await getDriveTokens(user.id);
    return res.json({
      hasCredentials: !!process.env.GOOGLE_CLIENT_ID,
      hasToken: !!driveData?.google_drive_tokens,
      ready: !!process.env.GOOGLE_CLIENT_ID && !!driveData?.google_drive_tokens
    });
  }

  if (action === 'create-doc') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const driveData = await getDriveTokens(user.id);
    if (!driveData?.google_drive_tokens) return res.status(401).json({ error: 'Google Drive non connecté.' });

    const { title, content } = req.body;
    const token = driveData.google_drive_tokens.access_token;

    try {
      const fileMetadata = {
        name: title, mimeType: 'application/vnd.google-apps.document',
        ...(driveData.drive_folder_id ? { parents: [driveData.drive_folder_id] } : {})
      };
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(fileMetadata)
      });
      const file = await createRes.json();
      if (!file.id) throw new Error(file.error?.message || 'Erreur création fichier');

      await fetch(`https://docs.googleapis.com/v1/documents/${file.id}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] })
      });

      return res.json({ success: true, url: file.webViewLink, docId: file.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'list-docs') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const driveData = await getDriveTokens(user.id);
    if (!driveData?.google_drive_tokens) return res.json({ files: [] });

    try {
      const token = driveData.google_drive_tokens.access_token;
      const query = driveData.drive_folder_id
        ? `'${driveData.drive_folder_id}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`
        : `name contains 'Candidature' and mimeType='application/vnd.google-apps.document' and trashed=false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=100`;
      const listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await listRes.json();
      return res.json({ files: data.files || [] });
    } catch { return res.json({ files: [] }); }
  }

  res.status(400).json({ error: 'Action inconnue. Utilise ?action=status|create-doc|list-docs' });
};
