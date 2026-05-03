const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'cooperatives.json'), 'utf8'));
  res.json(data);
};
