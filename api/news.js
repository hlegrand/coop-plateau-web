const { getNews, upsertNews } = require('../lib/db');

const queries = [
  'coopérative habitation Montréal Plateau actualité nouveau projet 2026',
  'logement coopératif Montréal réglementation programme subvention 2026',
  'FHCQ nouvelles coopérative habitation Québec'
];
const BLOCKED_DOMAINS = ['facebook.com', 'rentals.ca', 'realtor.ca', 'apartments.com', 'kijiji'];

async function refreshNews() {
  const allArticles = [];
  const seenUrls = new Set();

  for (const query of queries) {
    try {
      const r = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
        body: JSON.stringify({ query, limit: 5 })
      });
      const result = await r.json();
      for (const item of (result.data || result.web || [])) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        if (BLOCKED_DOMAINS.some(d => item.url.includes(d))) continue;
        allArticles.push({
          title: item.title || '', url: item.url || '',
          description: (item.description || '').substring(0, 300),
          source: new URL(item.url).hostname.replace('www.', '')
        });
      }
    } catch (err) {
      console.error('Firecrawl search error:', err.message);
    }
  }

  if (allArticles.length > 0) await upsertNews(allArticles);
  return allArticles.length;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const articles = await getNews(50);
      return res.json({ articles });
    } catch { return res.json({ articles: [] }); }
  }

  if (req.method === 'POST') {
    try {
      const count = await refreshNews();
      const articles = await getNews(50);
      return res.json({ articles, refreshed: count });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  res.status(405).json({ error: 'GET ou POST' });
};

module.exports.refreshNews = refreshNews;
