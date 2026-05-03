const { generateText } = require('../../lib/gemini');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { prompt: userPrompt, currentTemplate } = req.body;

  const prompt = `Tu es un assistant qui aide à rédiger des lettres de motivation pour des coopératives d'habitation autogérées au Québec.

Voici la lettre template actuelle :

"""
${currentTemplate}
"""

L'utilisateur demande la modification suivante : "${userPrompt}"

CONSIGNES :
- Modifie la lettre selon la demande de l'utilisateur
- Garde le même ton chaleureux et sincère
- Aucun symbole markdown, aucun tiret long, texte brut uniquement
- La lettre doit rester une lettre template générique
- Produis UNIQUEMENT la lettre modifiée, sans commentaire`;

  try {
    const template = await generateText(prompt, 2000);
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
