const { sql } = require('@vercel/postgres');
const { getUserFromRequest } = require('../lib/auth');

const ADMIN_EMAIL = 'legrand.henri46@gmail.com';

module.exports = async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const action = req.query.action || 'dashboard';

    if (action === 'dashboard') {
      const { rows: users } = await sql`
        SELECT u.id, u.email, u.name, u.google_id, u.created_at, u.password_hash IS NOT NULL as has_password,
          (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) as app_count
        FROM users u ORDER BY u.created_at DESC`;

      const { rows: statsRows } = await sql`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM applications) as total_applications,
          (SELECT COUNT(*) FROM applications WHERE status = 'envoyee') as sent_count,
          (SELECT COUNT(*) FROM applications WHERE status = 'google-docs') as docs_count`;

      const stats = statsRows[0];

      return res.json({
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          type: u.google_id.startsWith('email:') ? 'email' : 'google',
          appCount: parseInt(u.app_count),
          hasPassword: u.has_password,
          createdAt: u.created_at
        })),
        stats: {
          totalUsers: parseInt(stats.total_users),
          totalApplications: parseInt(stats.total_applications),
          sentCount: parseInt(stats.sent_count),
          docsCount: parseInt(stats.docs_count)
        }
      });
    }

    res.status(400).json({ error: 'Action inconnue' });
  } catch (err) {
    console.error('Admin error:', err);
    res.status(500).json({ error: err.message });
  }
};
