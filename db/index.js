const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_gestao',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Wrapper para gerenciar conexões
const db = {
    // Executa uma query e retorna os resultados
    async query(sql, params) {
        try {
            const [results] = await pool.query(sql, params);
            return [results];
        } catch (error) {
            console.error('Erro na query:', error);
            throw error;
        }
    },

    // Obtém uma conexão do pool
    async getConnection() {
        try {
            const connection = await pool.getConnection();
            return connection;
        } catch (error) {
            console.error('Erro ao obter conexão:', error);
            throw error;
        }
    },

    // Executa uma query com uma conexão específica
    async queryWithConnection(connection, sql, params) {
        try {
            const [results] = await connection.execute(sql, params);
            return [results];
        } catch (error) {
            console.error('Erro na query com conexão:', error);
            throw error;
        }
    },

    // Testa a conexão com o banco
    async testConnection() {
        try {
            const connection = await this.getConnection();
            console.log('Conexão com banco de dados estabelecida com sucesso!');
            connection.release();
            return true;
        } catch (error) {
            console.error('Erro ao conectar ao banco de dados:', error);
            throw error;
        }
    }
};

module.exports = db;