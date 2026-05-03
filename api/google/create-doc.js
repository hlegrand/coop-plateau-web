const { google } = require('googleapis');
const { requireAuth } = require('../../lib/auth');
const { getDriveTokens } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const driveData = await getDriveTokens(user.id);
  if (!driveData?.google_drive_tokens) {
    return res.status(401).json({ error: 'Google Drive non connecté. Configure ton dossier Drive dans les paramètres.' });
  }

  const { title, content } = req.body;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(driveData.google_drive_tokens);

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    const fileMetadata = {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      ...(driveData.drive_folder_id ? { parents: [driveData.drive_folder_id] } : {})
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, webViewLink'
    });

    await docs.documents.batchUpdate({
      documentId: file.data.id,
      resource: {
        requests: [{
          insertText: { location: { index: 1 }, text: content }
        }]
      }
    });

    res.json({ success: true, url: file.data.webViewLink, docId: file.data.id });
  } catch (err) {
    console.error('Google Docs error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
