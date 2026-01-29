// integrations/pix/index.js
// Fábrica de provedores PIX (SICOOB, BANCO_DO_BRASIL, etc.)

const sicoob = require('./sicoob');
const bb = require('./bb');

function getPixProvider(providerName) {
  const key = (providerName || '').toUpperCase();
  switch (key) {
    case 'SICOOB':
      return sicoob;
    case 'BANCO_DO_BRASIL':
    case 'BB':
      return bb;
    default:
      return null; // SIMULADO ou não suportado
  }
}

module.exports = { getPixProvider };
