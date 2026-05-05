require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function check() {
  const { rows } = await sql`SELECT id, email, name, profile, letter_template IS NOT NULL as has_template, drive_folder_id FROM users WHERE id = 2`;
  if (!rows.length) { console.log('User ID 2 not found!'); process.exit(1); }
  const u = rows[0];
  console.log('ID:', u.id);
  console.log('Email:', u.email);
  console.log('Name:', u.name);
  console.log('Profile keys:', Object.keys(u.profile || {}));
  console.log('Profile:', JSON.stringify(u.profile, null, 2));
  console.log('Has template:', u.has_template);
  console.log('Drive folder:', u.drive_folder_id);

  const { rows: apps } = await sql`SELECT coop_id, status FROM applications WHERE user_id = 2`;
  console.log('\nApplications:', apps.length);
  for (const a of apps) console.log(`  ${a.coop_id}: ${a.status}`);

  process.exit(0);
}
check().catch(console.error);
