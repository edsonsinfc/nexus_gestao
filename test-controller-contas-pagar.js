require('dotenv').config();
const ContasPagarController = require('./controllers/ContasPagarController');

// Mock de req e res
const req = {
  query: {
    page: 1,
    limit: 50
  },
  user: {
    id: 1
  }
};

const res = {
  json: (data) => {
    console.log('\n✅ Resposta da API:');
    console.log(JSON.stringify(data, null, 2));
  },
  status: (code) => {
    console.log(`\n❌ Status Code: ${code}`);
    return {
      json: (data) => {
        console.log('Erro:', JSON.stringify(data, null, 2));
      }
    };
  }
};

console.log('🧪 Testando ContasPagarController.listar()...\n');

ContasPagarController.listar(req, res)
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  });
