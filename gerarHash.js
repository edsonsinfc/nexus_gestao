// arquivo: gerarHash.js (bcrypt)
const bcrypt = require('bcryptjs');
const senhaParaHashear = '123456';

console.log(`Gerando hash seguro (bcrypt) para a senha: "${senhaParaHashear}"`);

bcrypt.hash(senhaParaHashear, 10, (err, hash) => {
  if (err) throw err;
  console.log("\n--- HASH GERADO (bcrypt) ---");
  console.log("Copie a linha abaixo e cole na coluna 'senha_hash' do seu banco:\n");
  console.log(hash);
  console.log("\n----------------------------");
});