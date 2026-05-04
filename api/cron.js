const { refreshNews } = require('./news');

module.exports = async (req, res) => {
  const action = req.query.action;

  if (action === 'daily-news') {
    try {
      const count = await refreshNews();
      return res.json({ success: true, articlesRefreshed: count });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'weekly-coops') {
    try {
      const r = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
        body: JSON.stringify({ query: 'nouvelle coopérative habitation Plateau Mont-Royal Montréal 2026', limit: 10 })
      });
      const result = await r.json();
      return res.json({ success: true, resultsFound: (result.data || result.web || []).length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(400).json({ error: 'Action inconnue' });
};
