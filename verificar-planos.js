const pool = require('./db');

async function verificar() {
  const [planos] = await pool.query('SELECT id, nome, codigo, parcelas, visivel_vendas, visivel_compras, ativo FROM planos_pagamento ORDER BY id');
  
  console.log('\n📋 Planos de Pagamento Cadastrados:\n');
  planos.forEach(p => {
    const vendas = p.visivel_vendas ? '✓' : '✗';
    const compras = p.visivel_compras ? '✓' : '✗';
    const status = p.ativo ? '✅' : '❌';
    console.log(`${p.id}. ${p.nome} (${p.codigo}) - ${p.parcelas}x | Vendas: ${vendas} | Compras: ${compras} ${status}`);
  });
  
  console.log(`\n✅ Total: ${planos.length} planos\n`);
  process.exit(0);
}

verificar().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
