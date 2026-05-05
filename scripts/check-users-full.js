require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

sql`SELECT id, email, name, google_id, password_hash, (profile->>'password_hash') as profile_pw FROM users`.then(r => {
  for (const u of r.rows) {
    console.log(`ID:${u.id} | ${u.email} | google_id:${u.google_id} | pw_col:${u.password_hash ? 'YES' : 'NO'} | pw_profile:${u.profile_pw ? 'YES' : 'NO'}`);
  }
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
