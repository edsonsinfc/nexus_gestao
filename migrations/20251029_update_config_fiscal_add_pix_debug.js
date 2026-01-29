const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPixDebugFlag() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'nexus_dev'
  });

  try {
    console.log('🔧 Verificando/Adicionando coluna pix_debug em configuracoes_fiscais...');
    const [exists] = await connection.execute(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracoes_fiscais' AND COLUMN_NAME = 'pix_debug'"
    );
    if (exists.length === 0) {
      await connection.execute("ALTER TABLE configuracoes_fiscais ADD COLUMN pix_debug TINYINT(1) DEFAULT 0 AFTER pix_webhook_token");
      console.log('✅ Coluna pix_debug adicionada com DEFAULT 0');
    } else {
      console.log('ℹ️ Coluna pix_debug já existe');
    }
  } catch (err) {
    console.error('❌ Erro ao adicionar pix_debug:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  addPixDebugFlag();
}

module.exports = addPixDebugFlag;
