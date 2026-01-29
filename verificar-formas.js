const pool = require('./db');

async function verificar() {
  console.log('\n📋 FORMAS DE PAGAMENTO:\n');
  const [formas] = await pool.query(`
    SELECT id, nome, codigo, tipo, permite_parcelamento, 
           dias_compensacao, taxa_percentual, taxa_fixa,
           visivel_vendas, visivel_compras, ativo
    FROM formas_pagamento 
    ORDER BY id
  `);
  
  formas.forEach(f => {
    const vendas = f.visivel_vendas ? '✓' : '✗';
    const compras = f.visivel_compras ? '✓' : '✗';
    const parcela = f.permite_parcelamento ? '✓' : '✗';
    const status = f.ativo ? '✅' : '❌';
    console.log(`${f.id}. ${f.nome} (${f.codigo}) - ${f.tipo}`);
    console.log(`   Parcela: ${parcela} | Dias: ${f.dias_compensacao} | Taxa: ${f.taxa_percentual}% + R$${f.taxa_fixa}`);
    console.log(`   Vendas: ${vendas} | Compras: ${compras} ${status}\n`);
  });
  
  console.log('\n🔗 RELACIONAMENTOS (Forma → Planos):\n');
  const [relacoes] = await pool.query(`
    SELECT f.nome as forma, GROUP_CONCAT(p.codigo ORDER BY p.parcelas SEPARATOR ', ') as planos
    FROM formas_pagamento_planos fpp
    JOIN formas_pagamento f ON f.id = fpp.forma_pagamento_id
    JOIN planos_pagamento p ON p.id = fpp.plano_pagamento_id
    WHERE fpp.ativo = TRUE
    GROUP BY f.id, f.nome
    ORDER BY f.id
  `);
  
  relacoes.forEach(r => {
    console.log(`  ${r.forma} → ${r.planos}`);
  });
  
  console.log(`\n✅ Total: ${formas.length} formas, ${await pool.query('SELECT COUNT(*) as c FROM formas_pagamento_planos').then(([r]) => r[0].c)} relacionamentos\n`);
  process.exit(0);
}

verificar().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
