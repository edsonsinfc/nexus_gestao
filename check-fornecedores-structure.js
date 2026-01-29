require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_gestao'
  });

  try {
    const [fornecedores] = await connection.query('DESCRIBE fornecedores');
    console.log('\n📊 Estrutura da tabela fornecedores:');
    console.table(fornecedores);

    const [usuarios] = await connection.query('DESCRIBE usuarios');
    console.log('\n📊 Estrutura da tabela usuarios:');
    console.table(usuarios);

    const [categorias] = await connection.query('DESCRIBE categorias_financeiras');
    console.log('\n📊 Estrutura da tabela categorias_financeiras:');
    console.table(categorias);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

checkStructure();
