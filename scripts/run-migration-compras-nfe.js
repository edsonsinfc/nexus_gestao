// scripts/run-migration-compras-nfe.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔧 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER?.replace(/'/g, '') || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'nexus_dev',
      multipleStatements: true
    });

    console.log('✅ Conectado ao banco nexus_dev');

    const migrationFile = path.join(__dirname, '..', 'migrations', '20251111_create_compras_nfe.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('📝 Executando migration de Compras e NF-e...');
    
    await connection.query(sql);

    console.log('');
    console.log('✅ Migration executada com sucesso!');
    console.log('');
    console.log('📊 Estrutura criada:');
    console.log('   🧾 NF-e de Entrada:');
    console.log('      - nfe_entrada (notas fiscais)');
    console.log('      - nfe_entrada_itens (produtos da nota)');
    console.log('      - manifestacoes_destinatario (histórico)');
    console.log('');
    console.log('   🛒 Pedidos de Compra:');
    console.log('      - pedidos_compra (cabeçalho)');
    console.log('      - pedidos_compra_itens (produtos)');
    console.log('');
    console.log('   📦 Entradas de Mercadorias:');
    console.log('      - entradas_mercadorias (cabeçalho)');
    console.log('      - entradas_mercadorias_itens (produtos)');
    console.log('');
    console.log('   💰 Cotações (futuro):');
    console.log('      - cotacoes, cotacoes_itens, cotacoes_fornecedores');
    console.log('');
    console.log('💡 Próximos passos:');
    console.log('   1. Implementar controllers');
    console.log('   2. Criar rotas da API');
    console.log('   3. Desenvolver interfaces web');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
