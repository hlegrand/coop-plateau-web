require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

const applications = {
  "coup-double": { status: "lettre-generee", note: null },
  "bonheur-santisouk": { status: "non-soumise", note: "mauvais email" },
  "alliance": { status: "lettre-generee", note: null },
  "cote-cours": { status: "envoyee", note: "Envoyé le 2026-05-03 à selection.coop2101@gmail.com" },
  "familiale": { status: "envoyee", note: "Envoyé le 2026-05-03 à selection.lafamilialedemtl@gmail.com" },
  "academie-saints-anges": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/11uc4HBrNemj5elMmumlNvvMD3EZxj1Ydy7XFYeaAuIo/edit" },
  "amaryllis": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1lPXKhO1NNPauzGgUjmJ-jjVttBEcXFCCxKJPUzcKixo/edit" },
  "funambule": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1cVbntHsUKVIkwRpBDQIh37t6821px3yDXfBOE-Awvhk/edit" },
  "parthenair": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1PYf4dqaO_h_D-JJOweqkhqoo3XCmgKUPTc5fwFwt1w8/edit" },
  "au-pied-montagne": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1j1dRnMy56w1RoUjFqumQyilNbUBoeORZfCfNhuWV_-0/edit" },
  "cote-visitation": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1_QzLoTb5ON4_1dSVhiBxMPM5gAXpaVOtJDmgaFDSs20/edit" },
  "sept-cent-cinquante-et-un": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1kTXEJQC8J8UXQAH08cb80QVa59oFoobn2fvgrBzZixk/edit" },
  "le-plateau": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1p4p6tUhaJHtVr-VOgBaaTJvM72UklHc2kgEo-oD0OME/edit" },
  "ou": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1Qnv4mfGZ19G3ypt_3IU85_tVK1eju1w655BeqEdNkNk/edit" },
  "carcajou": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1oAtJA6aTYGu6E6toEES1_R3Ha0YZU-8YSUOtwcVqDs8/edit" },
  "chateau-maribert": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/18T5NnbPzijheDvgM_SdsGZ2v2DHMX8PPsznOG2yFNls/edit" },
  "marie-anne": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1dC9UyE_ZM4o8mY3scliQcbLNetzW1VLecA5zsqGT09k/edit" },
  "ombre-montagne": { status: "google-docs", note: "Google Doc créé le 2026-05-03", google_doc_url: "https://docs.google.com/document/d/1e7ZG95WevnLpt9sDhzNA37xgJOUS2nMIQNTPwbQbFxc/edit" },
};

async function migrate() {
  const { rows: users } = await sql`SELECT id FROM users WHERE email = 'legrand.henri46@gmail.com'`;
  if (!users.length) { console.error('User not found'); process.exit(1); }
  const userId = users[0].id;
  console.log(`User ID: ${userId}\n`);

  let updated = 0;
  for (const [coopId, data] of Object.entries(applications)) {
    await sql`
      INSERT INTO applications (user_id, coop_id, status, note, google_doc_url, updated_at)
      VALUES (${userId}, ${coopId}, ${data.status}, ${data.note || null}, ${data.google_doc_url || null}, NOW())
      ON CONFLICT (user_id, coop_id)
      DO UPDATE SET status = ${data.status}, note = ${data.note || null}, google_doc_url = ${data.google_doc_url || null}, updated_at = NOW()
    `;
    console.log(`  ${data.status.padEnd(15)} ${coopId}`);
    updated++;
  }

  console.log(`\nDone: ${updated} applications synced`);
  process.exit(0);
}

migrate().catch(console.error);
