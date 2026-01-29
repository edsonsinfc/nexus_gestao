const { getConnection } = require('../src/config/db.mysql');

async function testQuery() {
  try {
    console.log('Teste 1: Query básica');
    const pool = await getConnection();
    
    const params1 = [1];
    console.log('Params:', params1);
    
    const [result1] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM produtos 
      WHERE ativo = ?
    `, params1);
    
    console.log('✅ Resultado 1:', result1);
    
    console.log('\nTeste 2: Query com LIMIT e OFFSET');
    const params2 = [1, 20, 0];
    console.log('Params:', params2, 'Tipos:', params2.map(p => typeof p));
    
    const params2b = [1];
    const limit = 20;
    const offset = 0;
    
    const [result2] = await pool.execute(`
      SELECT id, codprod, descricao 
      FROM produtos 
      WHERE ativo = ?
      ORDER BY descricao
      LIMIT ${limit} OFFSET ${offset}
    `, params2b);
    
    console.log('✅ Resultado 2:', result2.length, 'produtos');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Code:', error.code);
    console.error('SQL:', error.sql);
    process.exit(1);
  }
}

testQuery();
