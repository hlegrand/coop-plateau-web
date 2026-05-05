require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function restore() {
  const profile = {
    name: 'Henri LEGRAND',
    phone: '438-630-9304',
    email: 'legrand.henri46@gmail.com',
    address: '4483 rue Garnier, H2J 3S3, Montréal',
    household: 'Famille monoparentale — 1 adulte + 2 enfants (3 ans et 4½ ans)',
    unitType: '5½'
  };

  await sql`UPDATE users SET profile = ${JSON.stringify(profile)}, drive_folder_id = '1QUX2cZPv9NrUDixt10O2RpY4mxidLYaA' WHERE id = 2`;
  console.log('Profile restored');
  console.log(JSON.stringify(profile, null, 2));
  process.exit(0);
}
restore().catch(console.error);
