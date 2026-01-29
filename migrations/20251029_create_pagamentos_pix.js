const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPagamentosPixTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_dev'
  });

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pagamentos_pix (
        id INT PRIMARY KEY AUTO_INCREMENT,
        txid VARCHAR(64) NOT NULL UNIQUE,
        valor DECIMAL(10,2) NOT NULL,
        status ENUM('PENDENTE','CONFIRMADO','CANCELADO','EXPIRADO') NOT NULL DEFAULT 'PENDENTE',
        copia_cola TEXT,
        qr_code_base64 MEDIUMTEXT,
        descricao VARCHAR(255),
        expiracao DATETIME,
        data_confirmacao DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tabela pagamentos_pix criada/verificada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabela pagamentos_pix:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  createPagamentosPixTable();
}

module.exports = createPagamentosPixTable;
