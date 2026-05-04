const { refreshNews } = require('../news/refresh');

module.exports = async (req, res) => {
  try {
    const count = await refreshNews();
    res.json({ success: true, articlesRefreshed: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
