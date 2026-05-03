const FirecrawlApp = require('@mendable/firecrawl-js').default;

module.exports = async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    const result = await firecrawl.search('nouvelle coopérative habitation Plateau Mont-Royal Montréal 2026 postuler candidature', { limit: 10 });
    const items = result.data || result.web || [];

    res.json({ success: true, resultsFound: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
