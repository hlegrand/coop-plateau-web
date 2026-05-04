const { requireAuth } = require('../../lib/auth');
const { getDriveTokens } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const driveData = await getDriveTokens(user.id);
  if (!driveData?.google_drive_tokens) {
    return res.status(401).json({ error: 'Google Drive non connecté.' });
  }

  const { title, content } = req.body;
  const token = driveData.google_drive_tokens.access_token;

  try {
    const fileMetadata = {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
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
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: 1 }, text: content } }]
      })
    });

    res.json({ success: true, url: file.webViewLink, docId: file.id });
  } catch (err) {
    console.error('Google Docs error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
