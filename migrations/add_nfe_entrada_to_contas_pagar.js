const mysql = require('mysql2/promise');
require('dotenv').config();

async function addNfeEntradaToContasPagar() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_dev'
  });

  try {
    console.log('🔧 Adicionando coluna nfe_entrada_id na tabela contas_pagar...');

    // Verificar se coluna já existe
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'contas_pagar' AND COLUMN_NAME = 'nfe_entrada_id'
    `, [process.env.DB_NAME || 'nexus_dev']);

    if (columns.length > 0) {
      console.log('✅ Coluna nfe_entrada_id já existe');
      return;
    }

    // Adicionar coluna
    await connection.query(`
      ALTER TABLE contas_pagar
      ADD COLUMN nfe_entrada_id INT UNSIGNED NULL AFTER observacoes,
      ADD CONSTRAINT fk_contas_pagar_nfe_entrada 
        FOREIGN KEY (nfe_entrada_id) REFERENCES nfe_entrada(id) ON DELETE SET NULL
    `);

    console.log('✅ Coluna nfe_entrada_id adicionada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addNfeEntradaToContasPagar()
    .then(() => {
      console.log('✅ Migration concluída com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro na migration:', error);
      process.exit(1);
    });
}

module.exports = addNfeEntradaToContasPagar;
