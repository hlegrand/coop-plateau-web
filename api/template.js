const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../lib/auth');
const { getTemplate, saveTemplate } = require('../lib/db');
const { generateText } = require('../lib/gemini');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const action = req.query.action || (req.method === 'GET' ? 'get' : 'save');

  if (action === 'get' || req.method === 'GET') {
    let template = await getTemplate(user.id);
    if (!template) {
      template = fs.readFileSync(path.join(process.cwd(), 'data', 'letter-template-default.txt'), 'utf8');
    }
    return res.json({ template });
  }

  if (action === 'save') {
    await saveTemplate(user.id, req.body.template);
    return res.json({ success: true });
  }

  if (action === 'regenerate') {
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
      return res.json({ template });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(400).json({ error: 'Action inconnue. Utilise ?action=get|save|regenerate' });
};
