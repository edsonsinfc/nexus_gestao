const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUsuariosTable() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'nexus_dev'
    });

    console.log('📦 Conectado ao banco de dados');

    // Lista de colunas necessárias
    const requiredColumns = [
      { 
        name: 'email', 
        sql: 'ADD COLUMN email varchar(100) NULL UNIQUE AFTER login'
      },
      {
        name: 'senha',
        sql: 'CHANGE COLUMN senha_hash senha varchar(255) NOT NULL'
      },
      { 
        name: 'created_at', 
        sql: 'ADD COLUMN created_at timestamp DEFAULT CURRENT_TIMESTAMP' 
      },
      { 
        name: 'updated_at', 
        sql: 'ADD COLUMN updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' 
      }
    ];

    // Verificar e adicionar/modificar colunas
    for (const column of requiredColumns) {
      try {
        if (column.name === 'senha') {
          // Caso especial para renomear senha_hash para senha
          await connection.query(`ALTER TABLE usuarios ${column.sql}`);
          console.log(`✅ Coluna senha_hash renomeada para senha com sucesso!`);
        } else {
          const [columnExists] = await connection.query('SHOW COLUMNS FROM usuarios LIKE ?', [column.name]);
          
          if (columnExists.length === 0) {
            console.log(`🔄 Adicionando coluna ${column.name}...`);
            await connection.query(`ALTER TABLE usuarios ${column.sql}`);
            console.log(`✅ Coluna ${column.name} adicionada com sucesso!`);
          } else {
            console.log(`✅ Coluna ${column.name} já existe!`);
          }
        }
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️ Coluna ${column.name} já existe com outro nome`);
        } else {
          throw error;
        }
      }
    }

    // Atualizar o tipo de autenticação para utilizar email
    const [rows] = await connection.query('SELECT id, login FROM usuarios WHERE email IS NULL');
    
    for (const user of rows) {
      console.log(`🔄 Atualizando email para usuário ${user.login}...`);
      await connection.query(
        'UPDATE usuarios SET email = ? WHERE id = ?',
        [`${user.login}@nexusgestao.com.br`, user.id]
      );
    }

    console.log('🎉 Estrutura da tabela usuarios atualizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixUsuariosTable();