const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixVendedoresTable() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'nexus_dev'
    });

    console.log('📦 Conectado ao banco de dados');

    // Verificar se a coluna codigo existe
    const [columns] = await connection.query('SHOW COLUMNS FROM vendedores LIKE "codigo"');
    
    if (columns.length === 0) {
      console.log('🔄 Adicionando coluna codigo...');
      
      // Primeiro adicionar a coluna permitindo NULL
      await connection.query('ALTER TABLE vendedores ADD COLUMN codigo varchar(20) NULL AFTER id');
      
      // Atualizar registros existentes com códigos únicos
      const [rows] = await connection.query('SELECT id FROM vendedores WHERE codigo IS NULL');
      console.log(`🔄 Atualizando ${rows.length} registros com novos códigos...`);
      
      for (const row of rows) {
        // Gerando um código no formato V001, V002, etc
        const codigo = `V${row.id.toString().padStart(3, '0')}`;
        
        await connection.query(
          'UPDATE vendedores SET codigo = ? WHERE id = ?',
          [codigo, row.id]
        );
      }
      
      // Agora tornar a coluna NOT NULL e UNIQUE
      await connection.query('ALTER TABLE vendedores MODIFY codigo varchar(20) NOT NULL UNIQUE');
      
      console.log('✅ Coluna codigo adicionada e configurada com sucesso!');
    } else {
      console.log('✅ Coluna codigo já existe!');
    }

    // Verificar e adicionar outras colunas necessárias
    const requiredColumns = [
      { name: 'nome', sql: 'ADD COLUMN nome varchar(100) NOT NULL' },
      { name: 'cpf', sql: 'ADD COLUMN cpf varchar(14) NULL UNIQUE' },
      { name: 'telefone', sql: 'ADD COLUMN telefone varchar(20) NULL' },
      { name: 'email', sql: 'ADD COLUMN email varchar(100) NULL' },
      { name: 'endereco', sql: 'ADD COLUMN endereco text NULL' },
      { name: 'comissao_padrao', sql: 'ADD COLUMN comissao_padrao decimal(5,2) DEFAULT 2.50' },
      { name: 'ativo', sql: 'ADD COLUMN ativo tinyint(1) DEFAULT 1' },
      { name: 'created_at', sql: 'ADD COLUMN created_at timestamp DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ADD COLUMN updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];

    for (const column of requiredColumns) {
      const [columnExists] = await connection.query('SHOW COLUMNS FROM vendedores LIKE ?', [column.name]);
      
      if (columnExists.length === 0) {
        console.log(`🔄 Adicionando coluna ${column.name}...`);
        await connection.query(`ALTER TABLE vendedores ${column.sql}`);
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

fixVendedoresTable();