const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Função para executar scripts SQL
async function executarScript(scriptPath) {
    try {
        console.log(`📜 Executando script: ${scriptPath}`);
        const sql = await fs.readFile(scriptPath, 'utf8');
        const comandos = sql.split(';').filter(cmd => cmd.trim());
        
        for (const comando of comandos) {
            if (comando.trim()) {
                try {
                    await pool.query(comando);
                    console.log('✅ Comando executado com sucesso');
                } catch (err) {
                    console.error('❌ Erro ao executar comando:', err);
                    throw err;
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao executar script:', error);
        throw error;
    }
}

// Rota para executar o script SQL de criação das tabelas
router.post('/setup-database', async (req, res) => {
    try {
        // Lê o arquivo SQL
        const sqlPath = path.join(__dirname, '..', '..', 'scripts', 'create_tables.sql');
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
            await connection.execute(command + ';');
        }

        // Fecha a conexão
        await connection.end();

        res.json({ message: 'Tabelas criadas com sucesso!' });
    } catch (error) {
        console.error('Erro ao configurar banco de dados:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para corrigir tabela produtos
router.post('/fix-produtos', authenticateToken, async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../../scripts/add_preco_venda_column.sql');
        await executarScript(scriptPath);
        res.json({ message: 'Tabela produtos corrigida com sucesso!' });
    } catch (error) {
        console.error('Erro ao corrigir tabela produtos:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;