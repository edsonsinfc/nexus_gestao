const http = require('http');

// Token JWT do usuário admin
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInBlcmZpbElkIjoxLCJub21lIjoiQWRtaW4gZG8gU2lzdGVtYSIsImlhdCI6MTc2Mjk2MzQxNCwiZXhwIjoxNzYyOTkyMjE0fQ.uYiXRB-1HcWA2yPGLBkN2HXaBCGH4LmBH6-wL1YM2u8';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/planos-pagamento',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Testando API /api/planos-pagamento...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      const planos = JSON.parse(data);
      console.log(`\n✅ API funcionando! ${planos.length} planos encontrados:\n`);
      
      planos.forEach(p => {
        const vendas = p.visivel_vendas ? '✓' : '✗';
        const compras = p.visivel_compras ? '✗' : '✗';
        const status = p.ativo ? '✅' : '❌';
        console.log(`  ${p.id}. ${p.nome} (${p.parcelas}x) - Vendas: ${vendas} | Compras: ${compras} ${status}`);
      });
      
      console.log('\n🎉 Sistema de Planos de Pagamento pronto para uso!\n');
    } else {
      console.log('❌ Erro:', data);
    }
    
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('❌ Erro na requisição:', e.message);
  process.exit(1);
});

req.end();
