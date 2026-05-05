const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const action = req.query.action;

    if (action === 'monthly-coops') {
      const key = process.env.GOOGLE_SEARCH_API_KEY || process.env.GEMINI_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_CX;

      if (!key || !cx) {
        return res.json({ success: false, error: 'Google Search not configured' });
      }

      const queries = [
        'nouveau projet coopérative habitation Plateau Mont-Royal Montréal 2026 2027 construction',
        'nouveau logement coopératif Montréal Plateau ouverture candidature 2026'
      ];

      const coopsPath = path.join(process.cwd(), 'data', 'cooperatives.json');
      const coops = JSON.parse(fs.readFileSync(coopsPath, 'utf8'));
      const existingNames = new Set(coops.map(c => c.name.toLowerCase()));

      const newProjects = [];

      for (const query of queries) {
        try {
          const params = new URLSearchParams({ key, cx, q: query, num: '10', lr: 'lang_fr' });
          const r = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
          const result = await r.json();

          for (const item of (result.items || [])) {
            const title = item.title || '';
            const snippet = item.snippet || '';
            const url = item.link || '';

            const coopMatch = (title + ' ' + snippet).match(/coop[ée]rative\s+(?:d'habitation\s+)?(?:de\s+)?([A-ZÀ-Ü][\w\s'-]+)/i);
            if (coopMatch) {
              const name = coopMatch[1].trim();
              if (!existingNames.has(name.toLowerCase()) && name.length > 3 && name.length < 60) {
                newProjects.push({ name, url, snippet: snippet.substring(0, 200) });
                existingNames.add(name.toLowerCase());
              }
            }
          }
        } catch (err) {
          console.error('Cron search error:', err.message);
        }
      }

      return res.json({
        success: true,
        date: new Date().toISOString(),
        newProjectsFound: newProjects.length,
        projects: newProjects
      });
    }

    res.status(400).json({ error: 'Action inconnue' });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: err.message });
  }
};
