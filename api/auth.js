const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    const redirectUri = `https://${req.headers.host}/api/auth?action=callback`;

    if (action === 'login') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID manquant' });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',
        access_type: 'offline',
        prompt: 'consent'
      });
      return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }

    if (action === 'callback') {
      const { code } = req.query;
      if (!code) return res.status(400).json({ error: 'Code manquant' });

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      const tokens = await tokenRes.json();
      if (tokens.error) return res.status(400).json({ error: tokens.error_description || tokens.error });

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userInfo = await userRes.json();

      const { rows } = await sql`
        INSERT INTO users (google_id, email, name)
        VALUES (${userInfo.id}, ${userInfo.email}, ${userInfo.name})
        ON CONFLICT (google_id) DO UPDATE SET email = ${userInfo.email}, name = ${userInfo.name}
        RETURNING id, email, name`;
      const dbUser = rows[0];

      if (tokens.refresh_token) {
        await sql`UPDATE users SET google_drive_tokens = ${JSON.stringify(tokens)} WHERE id = ${dbUser.id}`;
      }

      res.setHeader('Set-Cookie', `auth_user=${encodeURIComponent(JSON.stringify({ id: dbUser.id, email: dbUser.email, name: dbUser.name }))}; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
      return res.redirect('/');
    }

    if (action === 'session') {
      const cookie = req.headers.cookie || '';
      const match = cookie.match(/auth_user=([^;]+)/);
      if (!match) return res.status(401).json({ error: 'Non connecté' });
      try {
        const user = JSON.parse(decodeURIComponent(match[1]));
        return res.json(user);
      } catch {
        return res.status(401).json({ error: 'Session invalide' });
      }
    }

    if (action === 'logout') {
      res.setHeader('Set-Cookie', 'auth_user=; Path=/; Max-Age=0');
      return res.redirect('/');
    }

    res.status(400).json({ error: 'Action inconnue' });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: err.message });
  }
};
