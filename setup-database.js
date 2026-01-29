// setup-database.js - Script para configurar o banco de dados
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Configurando banco de dados...');
    
    // Conectar sem especificar database para criar se não existir
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    // Criar database se não existir
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'nexus_dev'}`);
    console.log('✅ Database criado/verificado');

    // Conectar ao database específico
    await connection.end();
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nexus_dev',
    });

    // Ler e executar schema
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir em comandos individuais
    const commands = schema.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        await connection.query(command);
      }
    }
    
    console.log('✅ Schema executado com sucesso');

    // Executar seed data
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf8');
      const seedCommands = seed.split(';').filter(cmd => cmd.trim());
      
      for (const command of seedCommands) {
        if (command.trim()) {
          await connection.query(command);
        }
      }
      
      console.log('✅ Dados de exemplo inseridos');
    }

    console.log('🎉 Banco de dados configurado com sucesso!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Execute: npm run start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Login: admin / 123456');
    console.log('4. Explore a área administrativa!');

  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
