const { getNews, upsertNews } = require('../lib/db');

const queries = [
  'coopérative habitation Montréal Plateau actualité nouveau projet 2026',
  'logement coopératif Montréal réglementation programme subvention 2026',
  'FHCQ nouvelles coopérative habitation Québec'
];
const BLOCKED_DOMAINS = ['facebook.com', 'rentals.ca', 'realtor.ca', 'apartments.com', 'kijiji'];

async function searchFirecrawl(query, limit) {
  const r = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
    body: JSON.stringify({ query, limit })
  });
  const result = await r.json();
  if (result.error) throw new Error('Firecrawl: ' + result.error);
  return (result.data || result.web || []).map(item => ({
    title: item.title || '', url: item.url || '',
    description: (item.description || '').substring(0, 300)
  }));
}

async function searchGoogle(query, limit) {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) throw new Error('Google Search not configured');
  const params = new URLSearchParams({ key, cx, q: query, num: String(limit), lr: 'lang_fr' });
  const r = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  const result = await r.json();
  if (result.error) throw new Error('Google: ' + result.error.message);
  return (result.items || []).map(item => ({
    title: item.title || '', url: item.link || '',
    description: (item.snippet || '').substring(0, 300)
  }));
}

async function searchWithFallback(query, limit) {
  try {
    if (process.env.FIRECRAWL_API_KEY) {
      return await searchFirecrawl(query, limit);
    }
  } catch (err) {
    console.log('Firecrawl failed, falling back to Google:', err.message);
  }
  try {
    return await searchGoogle(query, limit);
  } catch (err) {
    console.error('All search providers failed:', err.message);
    return [];
  }
}

async function refreshNews() {
  const allArticles = [];
  const seenUrls = new Set();

  for (const query of queries) {
    const results = await searchWithFallback(query, 5);
    for (const item of results) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      if (BLOCKED_DOMAINS.some(d => item.url.includes(d))) continue;
      allArticles.push({
        ...item,
        source: new URL(item.url).hostname.replace('www.', '')
      });
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
