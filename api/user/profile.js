const { requireAuth } = require('../../lib/auth');
const { getUserById, updateProfile } = require('../../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const fullUser = await getUserById(user.id);
    return res.json({ profile: fullUser.profile || {} });
  }

  if (req.method === 'POST') {
    await updateProfile(user.id, req.body.profile);
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'GET ou POST' });
};
