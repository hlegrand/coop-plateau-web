require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function check() {
  const { rows } = await sql`SELECT COUNT(*) as c FROM news`;
  console.log('News count:', rows[0].c);

  const { rows: recent } = await sql`SELECT title, source, fetched_at FROM news ORDER BY fetched_at DESC LIMIT 5`;
  for (const n of recent) {
    console.log(`  ${n.source} | ${n.title?.substring(0, 60)}`);
  }
  process.exit(0);
}
check().catch(console.error);
