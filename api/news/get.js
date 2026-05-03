const { getNews } = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    const articles = await getNews(50);
    res.json({ articles });
  } catch (err) {
    res.json({ articles: [] });
  }
};
