const { requireAuth } = require('../../lib/auth');
const { saveTemplate } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireAuth(req, res);
  if (!user) return;

  await saveTemplate(user.id, req.body.template);
  res.json({ success: true });
};
