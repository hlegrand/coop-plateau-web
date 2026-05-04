require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function migrate() {
  // 1. Create or find Henri's user
  const { rows: existing } = await sql`SELECT * FROM users WHERE email = 'legrand.henri46@gmail.com'`;
  let user;
  if (existing.length > 0) {
    user = existing[0];
    console.log(`Found existing user: ${user.name} (id: ${user.id})`);
  } else {
    const { rows: created } = await sql`
      INSERT INTO users (google_id, email, name)
      VALUES ('henri-local-migration', 'legrand.henri46@gmail.com', 'Henri Legrand')
      RETURNING *`;
    user = created[0];
    console.log(`Created user: ${user.name} (id: ${user.id})`);
  }

  // 2. Update profile
  const profile = {
    name: 'Henri LEGRAND',
    phone: '438-630-9304',
    email: 'legrand.henri46@gmail.com',
    address: '4483 rue Garnier, H2J 3S3, Montréal',
    household: 'Famille monoparentale — 1 adulte + 2 enfants (3 ans et 4½ ans)',
    unitType: '5½',
    motivations: "Père monoparental suite à une séparation, je cherche un logement stable pour mes 2 enfants et moi. Installé sur le Plateau depuis plus de 5 ans (au Canada depuis 7 ans), c'est notre quartier de cœur — les enfants fréquentent le CPE Le Sablier, tous leurs amis sont ici, et c'est aussi mon seul réseau social car je n'ai pas de famille au Canada. La vie coopérative répond à mon besoin d'entraide et de communauté en tant que parent seul. Je crois profondément aux valeurs de démocratie, d'autogestion et d'économie sociale.",
    experiences: "Spécialiste en recherche utilisateur (UX Researcher) chez Ubisoft depuis plus de 5 ans — sensibilité à l'écoute, l'empathie et la recherche de solutions. Compétences numériques : création de tableaux de bord, gestion de site web (Drupal), communication digitale, newsletters. Très bon bricoleur et débrouillard : insonorisation de plafonds, construction de terrasse et abri à vélo, entretien mécanique. Expérience dans le milieu associatif et humanitaire : chef de projet web-marketing chez World Vision et agence de communication pour des associations humanitaires (Armée du Salut, ELA, Fondation Vinci)."
  };

  await sql`UPDATE users SET profile = ${JSON.stringify(profile)} WHERE id = ${user.id}`;
  console.log('Profile updated');

  // 3. Update letter template
  const fs = require('fs');
  const template = fs.readFileSync('D:\\hlegrand\\coop-plateau\\data\\letter-template.txt', 'utf8');
  await sql`UPDATE users SET letter_template = ${template} WHERE id = ${user.id}`;
  console.log('Letter template updated');

  // 4. Update Google Drive folder ID and tokens
  const driveFolder = '1QUX2cZPv9NrUDixt10O2RpY4mxidLYaA';
  await sql`UPDATE users SET drive_folder_id = ${driveFolder} WHERE id = ${user.id}`;
  console.log('Drive folder ID set');

  // 5. Insert application statuses from Google Docs
  const googleDocs = [
    { name: "Parthen'Air", url: "https://docs.google.com/document/d/1PYf4dqaO_h_D-JJOweqkhqoo3XCmgKUPTc5fwFwt1w8/edit", date: "2026-05-03" },
    { name: "À L'Ombre de la Montagne", url: "https://docs.google.com/document/d/1e7ZG95WevnLpt9sDhzNA37xgJOUS2nMIQNTPwbQbFxc/edit", date: "2026-05-03" },
    { name: "Marie-Anne", url: "https://docs.google.com/document/d/1dC9UyE_ZM4o8mY3scliQcbLNetzW1VLecA5zsqGT09k/edit", date: "2026-05-03" },
    { name: "Château Maribert", url: "https://docs.google.com/document/d/18T5NnbPzijheDvgM_SdsGZ2v2DHMX8PPsznOG2yFNls/edit", date: "2026-05-03" },
    { name: "Carcajou", url: "https://docs.google.com/document/d/1oAtJA6aTYGu6E6toEES1_R3Ha0YZU-8YSUOtwcVqDs8/edit", date: "2026-05-03" },
    { name: "D'Ou", url: "https://docs.google.com/document/d/1Qnv4mfGZ19G3ypt_3IU85_tVK1eju1w655BeqEdNkNk/edit", date: "2026-05-03" },
    { name: "Le Plateau", url: "https://docs.google.com/document/d/1p4p6tUhaJHtVr-VOgBaaTJvM72UklHc2kgEo-oD0OME/edit", date: "2026-05-03" },
    { name: "Le Sept Cent Cinquante Et Un", url: "https://docs.google.com/document/d/1kTXEJQC8J8UXQAH08cb80QVa59oFoobn2fvgrBzZixk/edit", date: "2026-05-03" },
    { name: "Côte-de-la-Visitation", url: "https://docs.google.com/document/d/1_QzLoTb5ON4_1dSVhiBxMPM5gAXpaVOtJDmgaFDSs20/edit", date: "2026-05-03" },
    { name: "Académie-des-Saints-Anges", url: "https://docs.google.com/document/d/11uc4HBrNemj5elMmumlNvvMD3EZxj1Ydy7XFYeaAuIo/edit", date: "2026-05-03" },
    { name: "Au Pied de la Montagne", url: "https://docs.google.com/document/d/1j1dRnMy56w1RoUjFqumQyilNbUBoeORZfCfNhuWV_-0/edit", date: "2026-05-03" },
    { name: "Amaryllis", url: "https://docs.google.com/document/d/1lPXKhO1NNPauzGgUjmJ-jjVttBEcXFCCxKJPUzcKixo/edit", date: "2026-05-03" },
    { name: "Funambule", url: "https://docs.google.com/document/d/1cVbntHsUKVIkwRpBDQIh37t6821px3yDXfBOE-Awvhk/edit", date: "2026-05-03" },
  ];

  // Load cooperatives to map names to IDs
  const coops = JSON.parse(fs.readFileSync('D:\\hlegrand\\coop-plateau-web\\data\\cooperatives.json', 'utf8'));

  let inserted = 0;
  for (const doc of googleDocs) {
    const coop = coops.find(c => c.name === doc.name);
    if (!coop) {
      console.log(`  SKIP: coop "${doc.name}" not found in data`);
      continue;
    }

    await sql`
      INSERT INTO applications (user_id, coop_id, status, note, google_doc_url, updated_at)
      VALUES (${user.id}, ${coop.id}, 'google-docs', ${'Google Doc créé le ' + doc.date}, ${doc.url}, NOW())
      ON CONFLICT (user_id, coop_id)
      DO UPDATE SET status = 'google-docs', note = ${'Google Doc créé le ' + doc.date}, google_doc_url = ${doc.url}, updated_at = NOW()
    `;
    inserted++;
    console.log(`  + ${coop.name} -> google-docs`);
  }

  console.log(`\nMigration complete: ${inserted} applications inserted`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
