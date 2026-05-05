const { sql } = require('@vercel/postgres');

async function getUser(googleId) {
  const { rows } = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
  return rows[0] || null;
}

async function createUser(googleId, email, name) {
  const { rows } = await sql`
    INSERT INTO users (google_id, email, name)
    VALUES (${googleId}, ${email}, ${name})
    ON CONFLICT (google_id) DO UPDATE SET email = ${email}, name = ${name}
    RETURNING *`;
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] || null;
}

async function updateProfile(userId, profile) {
  const { rows } = await sql`SELECT profile FROM users WHERE id = ${userId}`;
  const existing = rows[0]?.profile || {};
  const merged = { ...existing, ...profile };
  await sql`UPDATE users SET profile = ${JSON.stringify(merged)} WHERE id = ${userId}`;
}

async function getTemplate(userId) {
  const { rows } = await sql`SELECT letter_template FROM users WHERE id = ${userId}`;
  return rows[0]?.letter_template || null;
}

async function saveTemplate(userId, template) {
  await sql`UPDATE users SET letter_template = ${template} WHERE id = ${userId}`;
}

async function getApplications(userId) {
  const { rows } = await sql`SELECT * FROM applications WHERE user_id = ${userId} ORDER BY updated_at DESC`;
  return rows;
}

async function upsertApplication(userId, coopId, data) {
  const { rows } = await sql`
    INSERT INTO applications (user_id, coop_id, status, note, letter, google_doc_url, updated_at)
    VALUES (${userId}, ${coopId}, ${data.status || 'non-soumise'}, ${data.note || null}, ${data.letter || null}, ${data.google_doc_url || null}, NOW())
    ON CONFLICT (user_id, coop_id)
    DO UPDATE SET status = ${data.status || 'non-soumise'}, note = ${data.note || null}, letter = ${data.letter || null}, google_doc_url = ${data.google_doc_url || null}, updated_at = NOW()
    RETURNING *`;
  return rows[0];
}

async function saveDriveTokens(userId, tokens, folderId) {
  await sql`UPDATE users SET google_drive_tokens = ${JSON.stringify(tokens)}, drive_folder_id = ${folderId} WHERE id = ${userId}`;
}

async function getDriveTokens(userId) {
  const { rows } = await sql`SELECT google_drive_tokens, drive_folder_id FROM users WHERE id = ${userId}`;
  return rows[0] || null;
}

async function getNews(limit = 50) {
  const { rows } = await sql`SELECT * FROM news ORDER BY fetched_at DESC LIMIT ${limit}`;
  return rows;
}

async function upsertNews(articles) {
  for (const a of articles) {
    await sql`
      INSERT INTO news (title, url, description, source, fetched_at)
      VALUES (${a.title}, ${a.url}, ${a.description}, ${a.source}, NOW())
      ON CONFLICT (url) DO UPDATE SET title = ${a.title}, description = ${a.description}, fetched_at = NOW()`;
  }
}

module.exports = {
  getUser, createUser, getUserById, updateProfile,
  getTemplate, saveTemplate,
  getApplications, upsertApplication,
  saveDriveTokens, getDriveTokens,
  getNews, upsertNews
};
