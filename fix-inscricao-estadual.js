const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixInscricaoEstadual() {
  let connection;

  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'nexus_dev'
    });

    console.log('📦 Conectado ao banco de dados');

    // Verificar se a coluna inscricao_estadual existe
    const [columns] = await connection.query('SHOW COLUMNS FROM fornecedores LIKE "inscricao_estadual"');
    
    if (columns.length === 0) {
      console.log('🔄 Adicionando coluna inscricao_estadual...');
      await connection.query(`
        ALTER TABLE fornecedores 
        ADD COLUMN inscricao_estadual varchar(20) NULL AFTER cnpj
      `);
      console.log('✅ Coluna inscricao_estadual adicionada com sucesso!');
    } else {
      console.log('✅ Coluna inscricao_estadual já existe!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixInscricaoEstadual();