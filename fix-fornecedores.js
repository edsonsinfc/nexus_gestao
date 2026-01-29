const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFornecedoresTable() {
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

    // Verificar se a coluna codigo existe
    const [columns] = await connection.query('SHOW COLUMNS FROM fornecedores LIKE "codigo"');
    
    if (columns.length === 0) {
      console.log('🔄 Adicionando coluna codigo...');
      
      // Primeiro adicionar a coluna permitindo NULL
      await connection.query('ALTER TABLE fornecedores ADD COLUMN codigo varchar(20) NULL AFTER id');
      
      // Atualizar registros existentes com códigos únicos
      const [rows] = await connection.query('SELECT id FROM fornecedores WHERE codigo IS NULL');
      console.log(`🔄 Atualizando ${rows.length} registros com novos códigos...`);
      
      for (const row of rows) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const codigo = `F${timestamp.toString().slice(-6)}${random}`;
        
        await connection.query(
          'UPDATE fornecedores SET codigo = ? WHERE id = ?',
          [codigo, row.id]
        );
      }
      
      // Agora tornar a coluna NOT NULL e UNIQUE
      await connection.query('ALTER TABLE fornecedores MODIFY codigo varchar(20) NOT NULL UNIQUE');
      
      console.log('✅ Coluna codigo adicionada e configurada com sucesso!');
    } else {
      console.log('✅ Coluna codigo já existe!');
    }

    // Verificar se existem registros sem código
    const [rows] = await connection.query('SELECT id FROM fornecedores WHERE codigo IS NULL');
    
    if (rows.length > 0) {
      console.log(`🔄 Atualizando ${rows.length} registros sem código...`);
      for (const row of rows) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const codigo = `F${timestamp.toString().slice(-6)}${random}`;
        
        await connection.query(
          'UPDATE fornecedores SET codigo = ? WHERE id = ?',
          [codigo, row.id]
        );
      }
      console.log('✅ Registros atualizados com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixFornecedoresTable();