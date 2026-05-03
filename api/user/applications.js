const { requireAuth } = require('../../lib/auth');
const { getApplications, upsertApplication } = require('../../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

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

  res.status(405).json({ error: 'GET ou POST' });
};
