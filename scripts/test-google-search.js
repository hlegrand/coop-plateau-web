require('dotenv').config({ path: '.env.local' });

async function test() {
  const key = process.env.GEMINI_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX || '40821facdea574dd5';

  console.log('Key:', key ? key.substring(0, 10) + '...' : 'MISSING');
  console.log('CX:', cx);

  const params = new URLSearchParams({ key, cx, q: 'coopérative habitation Montréal 2026', num: '3', lr: 'lang_fr' });
  const url = `https://www.googleapis.com/customsearch/v1?${params}`;

  console.log('\nCalling Google Custom Search...');
  const r = await fetch(url);
  const result = await r.json();

  if (result.error) {
    console.error('ERROR:', result.error.code, result.error.message);
    return;
  }

  console.log('Results:', result.items?.length || 0);
  for (const item of (result.items || [])) {
    console.log(`  ${item.title}`);
    console.log(`  ${item.link}`);
    console.log();
  }
}
test().catch(console.error);
