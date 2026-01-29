const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'nexus_dev',
    multipleStatements: true
  });

  try {
    console.log('🔄 Conectado ao banco de dados nexus_dev');
    console.log('📂 Lendo arquivo de migration...');

    const migrationPath = path.join(__dirname, '..', 'migrations', '20251111_create_financeiro_fiscal.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚙️  Executando migration...\n');

    const [results] = await connection.query(sql);

    console.log('\n✅ Migration executada com sucesso!');
    
    // Contar tabelas criadas
    const tables = ['contas_bancarias', 'categorias_financeiras', 'lancamentos_financeiros', 
                    'extratos_bancarios', 'conciliacoes_bancarias', 'conciliacoes_itens',
                    'xml_envios_contador', 'xml_envios_detalhes', 'estatisticas_fiscais_cache'];
    
    console.log(`\n📊 Tabelas criadas: ${tables.length}`);
    tables.forEach(table => console.log(`   ✓ ${table}`));

    // Contar categorias inseridas
    const [categorias] = await connection.query('SELECT COUNT(*) as total FROM categorias_financeiras');
    console.log(`\n💼 Categorias financeiras criadas: ${categorias[0].total}`);

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('\n🔌 Conexão encerrada');
  }
}

runMigration();
