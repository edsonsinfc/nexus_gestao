const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateEnum() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'nexus_dev'
  });

  try {
    console.log('🔧 Atualizando enum de nfce.status...');
    await connection.execute(`
      ALTER TABLE nfce 
      MODIFY COLUMN status 
      ENUM('NAO_FISCAL','PENDENTE','AUTORIZADA','CANCELADA','INUTILIZADA') 
      DEFAULT 'NAO_FISCAL'
    `);
    console.log('✅ Enum atualizado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao atualizar enum:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  updateEnum();
}

module.exports = updateEnum;