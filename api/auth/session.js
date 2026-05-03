const { requireAuth } = require('../../lib/auth');
const { getUserById } = require('../../lib/db');

module.exports = async (req, res) => {
  const payload = await requireAuth(req, res);
  if (!payload) return;

  const user = await getUserById(payload.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    profile: user.profile,
    hasDriveTokens: !!user.google_drive_tokens
  });
};
