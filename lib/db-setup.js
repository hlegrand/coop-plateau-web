require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function setup() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      profile JSONB DEFAULT '{}',
      letter_template TEXT,
      google_drive_tokens JSONB,
      drive_folder_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      coop_id TEXT NOT NULL,
      status TEXT DEFAULT 'non-soumise',
      note TEXT,
      letter TEXT,
      google_doc_url TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, coop_id)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT,
      url TEXT UNIQUE,
      description TEXT,
      source TEXT,
      fetched_at TIMESTAMP DEFAULT NOW()
    )`;

  console.log('Database tables created.');
}

setup().catch(console.error);
