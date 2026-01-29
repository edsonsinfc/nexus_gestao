// arquivo: testeBcrypt.js
const bcrypt = require('bcryptjs');

const senhaDigitada = '123456';
const hashDoBanco = '$2a$10$8.K1CQ31EVF5h1pVIy2pI.eA.xLFrEoE/7f//0kXg3dQUd2/i51gq';

console.log('--- INICIANDO TESTE ISOLADO DO BCRYPT ---');
console.log('Senha a ser testada:', senhaDigitada);
console.log('Hash a ser comparado:', hashDoBanco);

try {
    // Usando a versão síncrona para simplificar o teste
    const resultado = bcrypt.compareSync(senhaDigitada, hashDoBanco); 
    
    console.log('\nO resultado da comparação foi:', resultado);

    if (resultado === true) {
        console.log('\n✅ SUCESSO! A biblioteca bcrypt está funcionando corretamente.');
    } else {
        console.log('\n❌ FALHA! A biblioteca bcrypt não está funcionando como esperado.');
        console.log('Isso indica um problema profundo no ambiente ou na instalação do pacote.');
    }
} catch (e) {
    console.error('\n🔥🔥🔥 ERRO CRÍTICO AO EXECUTAR BCRYPT:', e);
}
console.log('--- FIM DO TESTE ---');