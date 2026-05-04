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

  const isDefaultTemplate = template.includes('[Présentez-vous') || template.includes('[Votre nom]');

  let prompt;
  if (isDefaultTemplate) {
    prompt = `Tu dois rédiger une lettre de candidature pour la coopérative d'habitation "${cooperative.name}".

PROFIL DU CANDIDAT :
- Nom : ${profile.name || 'Non renseigné'}
- Téléphone : ${profile.phone || 'Non renseigné'}
- Email : ${profile.email || 'Non renseigné'}
- Adresse : ${profile.address || 'Non renseigné'}
- Ménage : ${profile.household || 'Non renseigné'}
- Logement recherché : ${profile.unitType || 'Non renseigné'}
- Motivations : ${profile.motivations || 'Non renseigné'}
- Expériences : ${profile.experiences || 'Non renseigné'}

COOPÉRATIVE VISÉE :
- Nom : ${cooperative.name}
- Adresse : ${cooperative.address}
- Nombre de logements : ${cooperative.units || 'Non spécifié'}
- Clientèle : ${cooperative.clientele || 'Générale'}
- Notes : ${cooperative.notes || 'Aucune'}

CONSIGNES :
1. Rédige une lettre formelle mais chaleureuse pour postuler à cette coopérative
2. Structure : date (${today}), coordonnées expéditeur, destinataire (Comité de sélection, Coopérative ${cooperative.name}), objet, corps en paragraphes fluides, formule de politesse, signature
3. Intègre naturellement les infos du profil : situation familiale, ancrage dans le quartier, motivations pour la vie coopérative, compétences concrètes pour les comités, expériences associatives
4. Personnalise selon les spécificités de la coop si des notes sont fournies
5. INTERDICTIONS : aucun symbole markdown, aucun tiret long, aucun crochet, texte brut uniquement. NE PAS inventer de détails non fournis dans le profil
6. Longueur : 400-500 mots

Produis UNIQUEMENT la lettre, sans commentaire.`;
  } else {
    prompt = `Tu dois adapter une lettre de candidature pour la coopérative d'habitation "${cooperative.name}".

LETTRE DE RÉFÉRENCE (approuvée par le candidat, reproduire le même ton et style) :

"""
${template}
"""

COOPÉRATIVE VISÉE :
- Nom : ${cooperative.name}
- Adresse : ${cooperative.address}
- Nombre de logements : ${cooperative.units || 'Non spécifié'}
- Clientèle : ${cooperative.clientele || 'Générale'}
- Notes : ${cooperative.notes || 'Aucune'}

CONSIGNES D'ADAPTATION :
1. Reprends la lettre quasi telle quelle, même ton, même structure
2. Remplacer le nom de la coopérative par "${cooperative.name}" dans le dernier paragraphe
3. Si la coop a des notes spécifiques, ajouter une phrase ou deux naturellement
4. Ajouter en en-tête : date du ${today}, coordonnées expéditeur, "Comité de sélection, Coopérative ${cooperative.name}${cooperative.address && !cooperative.address.includes('Quartier') && !cooperative.address.includes('C.P.') ? ', ' + cooperative.address : ''}", "Objet : Candidature pour un logement"
5. INTERDICTIONS : aucun symbole markdown, aucun tiret long, aucun crochet. Texte brut uniquement. NE PAS inventer de détails géographiques
6. NE PAS réécrire depuis zéro

Produis UNIQUEMENT la lettre adaptée, sans commentaire.`;
  }

  try {
    const letter = await generateText(prompt, 1500);
    res.json({ letter });
  } catch (err) {
    console.error('Erreur Gemini:', err.message);
    res.status(500).json({ error: `Erreur IA: ${err.message}` });
  }
};
