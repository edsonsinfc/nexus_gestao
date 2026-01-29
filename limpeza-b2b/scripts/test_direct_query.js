const mysql = require('mysql2/promise');
const { getConnection } = require('../src/config/db.mysql');

async function testDirect() {
  try {
    console.log('🔍 Teste direto da função buscarProdutos\n');
    
    const pool = await getConnection();
    
    // Simular parâmetros da requisição
    const page = 1;
    const pageSize = 20;
    const ativo = true;
    
    const pageNum = parseInt(page) || 1;
    const pageSizeNum = parseInt(pageSize) || 20;
    const offset = (pageNum - 1) * pageSizeNum;
    
    console.log('Parâmetros:', { page, pageSize, pageNum, pageSizeNum, offset, ativo });
    
    let whereClause = 'WHERE ativo = ?';
    let params = [ativo ? 1 : 0];
    
    console.log('WHERE clause:', whereClause);
    console.log('Params:', params);
    console.log('LIMIT:', pageSizeNum, 'OFFSET:', offset);
    
    // Executar query
    const sql = `
      SELECT 
        id, codprod, descricao, unidade, multiplos, 
        estoque, preco, ncm, categoria, foto, observacoes,
        created_at, updated_at
      FROM produtos 
      ${whereClause}
      ORDER BY descricao
      LIMIT ${pageSizeNum} OFFSET ${offset}
    `;
    
    console.log('\n📝 SQL:', sql);
    console.log('\n⚡ Executando query...');
    
    const [produtos] = await pool.execute(sql, params);
    
    console.log(`\n✅ ${produtos.length} produtos retornados:`);
    produtos.forEach((p, i) => {
      console.log(`  ${i+1}. [${p.codprod}] ${p.descricao} - ${p.unidade} (Múltiplos: ${p.multiplos})`);
    });
    
    // Contar total
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM produtos 
      WHERE ativo = ?
    `, params);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / pageSizeNum);
    
    console.log(`\n📊 Paginação:`);
    console.log(`  Total: ${total} produtos`);
    console.log(`  Páginas: ${totalPages}`);
    console.log(`  Página atual: ${pageNum}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
}

testDirect();
