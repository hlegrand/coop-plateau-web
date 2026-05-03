const fs = require('fs');
const path = require('path');
const { generateText } = require('../lib/gemini');
const { requireAuth } = require('../lib/auth');
const { getTemplate } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { profile, cooperative } = req.body;
  const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  let template = await getTemplate(user.id);
  if (!template) {
    template = fs.readFileSync(path.join(process.cwd(), 'data', 'letter-template-default.txt'), 'utf8');
  }

  const prompt = `Tu dois adapter une lettre de candidature pour la coopérative d'habitation "${cooperative.name}".

LETTRE DE RÉFÉRENCE (approuvée par le candidat — c'est le ton, le style et la structure à reproduire) :

"""
${template}
"""

COOPÉRATIVE VISÉE :
- Nom : ${cooperative.name}
- Adresse : ${cooperative.address}
- Nombre de logements : ${cooperative.units || 'Non spécifié'}
- Programme : ${cooperative.programme || 'Non spécifié'}
- Clientèle : ${cooperative.clientele || 'Générale'}
- Notes spécifiques : ${cooperative.notes || 'Aucune'}

CONSIGNES D'ADAPTATION :
1. Reprends la lettre de référence quasi telle quelle — même ton, même structure, mêmes paragraphes, même style d'écriture
2. Adaptations à faire :
   - Remplacer le nom de la coopérative par "${cooperative.name}" dans le dernier paragraphe
   - Si la coop a des notes spécifiques, ajouter une phrase ou deux qui y font référence naturellement
   - Si la coop a une clientèle particulière, adapter légèrement le ton
3. Ajouter en en-tête : la date du ${today}, puis les coordonnées de l'expéditeur, puis "Comité de sélection, Coopérative ${cooperative.name}${cooperative.address && !cooperative.address.includes('Quartier') && !cooperative.address.includes('C.P.') ? ', ' + cooperative.address : ''}", puis "Objet : Candidature pour un logement"
4. INTERDICTIONS : aucun symbole markdown (pas de **, *, ---, #, puces), aucun tiret long, aucun crochet. Texte brut uniquement. NE PAS inventer de détails géographiques
5. NE PAS réécrire la lettre depuis zéro. Garder le même texte avec des adaptations mineures

Produis UNIQUEMENT la lettre adaptée, sans commentaire.`;

  try {
    const letter = await generateText(prompt, 1500);
    res.json({ letter });
  } catch (err) {
    console.error('Erreur Gemini:', err.message);
    res.status(500).json({ error: `Erreur IA: ${err.message}` });
  }
};
