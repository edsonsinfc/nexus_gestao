const { getConnection } = require('../src/config/db.mysql');

async function testProdutos() {
  try {
    console.log('🔍 Testando conexão com banco de dados...');
    
    const pool = await getConnection();
    console.log('✅ Conexão obtida com sucesso');
    
    // Testar consulta simples
    const [result] = await pool.execute('SELECT COUNT(*) as total FROM produtos');
    console.log(`📦 Total de produtos no banco: ${result[0].total}`);
    
    // Testar consulta completa
    const [produtos] = await pool.execute(`
      SELECT 
        id, codprod, descricao, unidade, multiplos, 
        estoque, preco, ncm, categoria, ativo
      FROM produtos 
      WHERE ativo = 1
      LIMIT 5
    `);
    
    console.log(`\n📋 Primeiros ${produtos.length} produtos:`);
    produtos.forEach(p => {
      console.log(`  - [${p.codprod}] ${p.descricao} (${p.unidade}) - Múltiplos: ${p.multiplos}`);
    });
    
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('Detalhes:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    process.exit(1);
  }
}

testProdutos();
