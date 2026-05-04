require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

sql`SELECT id, email, name FROM users`.then(r => {
  console.log('Users:', JSON.stringify(r.rows, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
