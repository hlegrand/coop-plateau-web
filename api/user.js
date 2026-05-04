const { requireAuth } = require('../lib/auth');
const { getUserById, updateProfile, getApplications, upsertApplication } = require('../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const action = req.query.action;

  if (action === 'profile') {
    if (req.method === 'GET') {
      const fullUser = await getUserById(user.id);
      return res.json({ profile: fullUser.profile || {} });
    }
    if (req.method === 'POST') {
      await updateProfile(user.id, req.body.profile);
      return res.json({ success: true });
    }
  }

  if (action === 'applications') {
    if (req.method === 'GET') {
      const apps = await getApplications(user.id);
      return res.json({ applications: apps });
    }
    if (req.method === 'POST') {
      const { coopId, ...data } = req.body;
      if (!coopId) return res.status(400).json({ error: 'coopId requis' });
      const app = await upsertApplication(user.id, coopId, data);
      return res.json(app);
    }
  }

  res.status(400).json({ error: 'Action inconnue. Utilise ?action=profile|applications' });
};
