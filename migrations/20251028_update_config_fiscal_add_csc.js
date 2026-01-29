const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCSC() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'nexus_dev'
  });

  try {
    console.log('🔧 Verificando/Adicionando campos CSC em configuracoes_fiscais...');
    const [cols] = await connection.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracoes_fiscais' AND COLUMN_NAME IN ('csc_id','csc_token')"
    );
    const have = new Set(cols.map(r => r.COLUMN_NAME));
    if (!have.has('csc_id')) {
      await connection.execute("ALTER TABLE configuracoes_fiscais ADD COLUMN csc_id VARCHAR(10) NULL");
      console.log('✅ csc_id adicionado');
    } else {
      console.log('ℹ️ csc_id já existe');
    }
    if (!have.has('csc_token')) {
      await connection.execute("ALTER TABLE configuracoes_fiscais ADD COLUMN csc_token VARCHAR(64) NULL");
      console.log('✅ csc_token adicionado');
    } else {
      console.log('ℹ️ csc_token já existe');
    }
  } catch (err) {
    console.error('❌ Erro ao adicionar CSC:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  addCSC();
}

module.exports = addCSC;