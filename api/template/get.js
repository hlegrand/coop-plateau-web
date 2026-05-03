const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../lib/auth');
const { getTemplate } = require('../../lib/db');

module.exports = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  let template = await getTemplate(user.id);
  if (!template) {
    template = fs.readFileSync(path.join(process.cwd(), 'data', 'letter-template-default.txt'), 'utf8');
  }
  res.json({ template });
};
