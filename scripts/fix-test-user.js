require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fix() {
  await sql`DELETE FROM applications WHERE user_id = 5`;
  await sql`DELETE FROM users WHERE id = 5`;
  console.log('Test user (ID:5) deleted. Re-register on the web app.');

  // Also clean up duplicate Henri user (ID:1 from migration)
  const { rows } = await sql`SELECT id, google_id FROM users WHERE email = 'legrand.henri46@gmail.com' ORDER BY id`;
  if (rows.length > 1) {
    // Keep the Google one (ID:2), move applications from ID:1 to ID:2
    await sql`UPDATE applications SET user_id = ${rows[1].id} WHERE user_id = ${rows[0].id}`;
    await sql`DELETE FROM users WHERE id = ${rows[0].id}`;
    console.log(`Merged user ${rows[0].id} into ${rows[1].id}`);
  }

  const { rows: final } = await sql`SELECT id, email, google_id, password_hash IS NOT NULL as has_pw FROM users`;
  for (const u of final) {
    console.log(`  ID:${u.id} | ${u.email} | ${u.google_id.substring(0, 20)}... | pw:${u.has_pw}`);
  }

  process.exit(0);
}

fix().catch(console.error);
