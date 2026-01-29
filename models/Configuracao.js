const db = require('../db');

class Configuracao {
    static async getAll() {
        try {
            const [rows] = await db.query('SELECT * FROM configuracoes');
            const config = {};
            rows.forEach(row => {
                config[row.chave] = row.valor;
            });
            return config;
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            throw error;
        }
    }

    static async get(chave) {
        try {
            const [rows] = await db.query('SELECT valor FROM configuracoes WHERE chave = ?', [chave]);
            return rows.length > 0 ? rows[0].valor : null;
        } catch (error) {
            console.error(`Erro ao buscar configuração ${chave}:`, error);
            throw error;
        }
    }

    static async update(configs, usuarioId) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            for (const [chave, valor] of Object.entries(configs)) {
                await connection.query(
                    'UPDATE configuracoes SET valor = ?, usuario_modificacao = ? WHERE chave = ?',
                    [valor, usuarioId, chave]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Erro ao atualizar configurações:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Configuracao;