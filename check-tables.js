const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nexus_dev'
        });

        console.log('🔍 Verificando tabelas...');

        // Verifica tabela de clientes
        try {
            await connection.execute('SELECT * FROM clientes LIMIT 1');
            console.log('✅ Tabela clientes existe');
        } catch (error) {
            console.log('❌ Erro na tabela clientes:', error.message);
        }

        // Verifica tabela de produtos
        try {
            await connection.execute('SELECT * FROM produtos LIMIT 1');
            console.log('✅ Tabela produtos existe');
        } catch (error) {
            console.log('❌ Erro na tabela produtos:', error.message);
        }

        await connection.end();
    } catch (error) {
        console.error('Erro ao conectar ao banco:', error);
    }
}

checkTables();