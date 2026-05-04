const { upsertNews, getNews } = require('../../lib/db');

const queries = [
  'coopérative habitation Montréal Plateau actualité nouveau projet 2026',
  'logement coopératif Montréal réglementation programme subvention 2026',
  'FHCQ nouvelles coopérative habitation Québec'
];

const BLOCKED_DOMAINS = ['facebook.com', 'rentals.ca', 'realtor.ca', 'apartments.com', 'kijiji'];

async function searchWeb(query) {
  const url = `https://api.firecrawl.dev/v1/search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({ query, limit: 5 })
  });
  return res.json();
}

async function refreshNews() {
  const allArticles = [];
  const seenUrls = new Set();

  for (const query of queries) {
    try {
      const result = await searchWeb(query);
      const items = result.data || result.web || [];
      for (const r of items) {
        if (seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);
        if (BLOCKED_DOMAINS.some(d => r.url.includes(d))) continue;
        allArticles.push({
          title: r.title || '',
          url: r.url || '',
          description: (r.description || '').substring(0, 300),
          source: new URL(r.url).hostname.replace('www.', '')
        });
      }
    } catch (err) {
      console.error(`News search error:`, err.message);
    }
  }

  if (allArticles.length > 0) {
    await upsertNews(allArticles);
  }
  return allArticles.length;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const count = await refreshNews();
    const articles = await getNews(50);
    res.json({ articles, refreshed: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.refreshNews = refreshNews;
