const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFornecedoresColumns() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'nexus_dev'
    });

    console.log('📦 Conectado ao banco de dados');

    // Lista de colunas que devem existir
    const requiredColumns = [
      { name: 'telefone', sql: 'ADD COLUMN telefone varchar(20) NULL' },
      { name: 'email', sql: 'ADD COLUMN email varchar(100) NULL' },
      { name: 'endereco', sql: 'ADD COLUMN endereco text NULL' },
      { name: 'cidade', sql: 'ADD COLUMN cidade varchar(100) NULL' },
      { name: 'estado', sql: 'ADD COLUMN estado varchar(2) NULL' },
      { name: 'cep', sql: 'ADD COLUMN cep varchar(10) NULL' },
      { name: 'contato', sql: 'ADD COLUMN contato varchar(100) NULL' },
      { name: 'ativo', sql: 'ADD COLUMN ativo tinyint(1) DEFAULT 1' },
      { name: 'created_at', sql: 'ADD COLUMN created_at timestamp DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ADD COLUMN updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];

    // Verificar cada coluna
    for (const column of requiredColumns) {
      const [columns] = await connection.query('SHOW COLUMNS FROM fornecedores LIKE ?', [column.name]);
      
      if (columns.length === 0) {
        console.log(`🔄 Adicionando coluna ${column.name}...`);
        await connection.query(`ALTER TABLE fornecedores ${column.sql}`);
        console.log(`✅ Coluna ${column.name} adicionada com sucesso!`);
      } else {
        console.log(`✅ Coluna ${column.name} já existe!`);
      }
    }

    console.log('🎉 Todas as colunas verificadas e atualizadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixFornecedoresColumns();