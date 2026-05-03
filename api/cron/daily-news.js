const { refreshNews } = require('../news/refresh');

module.exports = async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const count = await refreshNews();
    res.json({ success: true, articlesRefreshed: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
