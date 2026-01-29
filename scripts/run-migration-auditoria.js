// scripts/run-migration-auditoria.js
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

    console.log('✅ Conectado ao banco de dados nexus_dev');

    console.log('✅ Conectado ao banco de dados');

    const migrationFile = path.join(__dirname, '..', 'migrations', '20251111_create_auditoria.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('📝 Executando migration de auditoria...');
    
    await connection.query(sql);

    console.log('✅ Migration de auditoria executada com sucesso!');
    console.log('');
    console.log('📊 Tabelas criadas:');
    console.log('   - auditoria (logs de mudanças)');
    console.log('   - user_sessions (sessões de usuário)');
    console.log('   - security_logs (eventos de segurança)');
    console.log('');
    console.log('🔍 Views criadas:');
    console.log('   - v_auditoria_resumo');
    console.log('   - v_ultimas_alteracoes');
    console.log('');
    console.log('⚡ Triggers criados para:');
    console.log('   - produtos (INSERT, UPDATE, DELETE)');
    console.log('   - vendas (INSERT, UPDATE)');
    console.log('');
    console.log('💡 Próximos passos:');
    console.log('   1. Reinicie o servidor: npm start');
    console.log('   2. Acesse: GET /api/auditoria (requer permissão admin)');
    console.log('   3. Teste fazendo mudanças em produtos/vendas');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
