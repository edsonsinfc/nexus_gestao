const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function setupBaseDatabase() {
    try {
        // Lê o arquivo SQL
        const sqlPath = path.join(__dirname, 'scripts', 'create_base_tables.sql');
        const sqlContent = await fs.readFile(sqlPath, 'utf8');

        // Divide o conteúdo em comandos individuais
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0);

        // Cria uma conexão com o banco
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nexus_dev',
            multipleStatements: true
        });

        // Executa cada comando
        for (const command of commands) {
            try {
                await connection.execute(command + ';');
                console.log('✅ Comando executado:', command.substring(0, 50) + '...');
            } catch (err) {
                // Se o erro for de chave duplicada, podemos ignorar
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log('⚠️ Registro já existe:', command.substring(0, 50) + '...');
                } else {
                    throw err;
                }
            }
        }

        // Fecha a conexão
        await connection.end();

        console.log('🎉 Tabelas base criadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao configurar banco de dados:', error);
    }
}

// Carrega as variáveis de ambiente
require('dotenv').config();

// Executa a função
setupBaseDatabase();