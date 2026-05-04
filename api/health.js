module.exports = (req, res) => {
  res.json({
    ok: true,
    node: process.version,
    env: {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasPostgres: !!process.env.POSTGRES_URL,
      hasFirecrawl: !!process.env.FIRECRAWL_API_KEY
    }
  });
};
