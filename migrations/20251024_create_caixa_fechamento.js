const mysql = require('mysql2/promise');
require('dotenv').config();

async function createCaixaFechamento() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Tabela para movimentações do caixa
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS caixa_movimentos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                caixa_id INT NOT NULL,
                tipo VARCHAR(20) NOT NULL, -- VENDA, SANGRIA, SUPRIMENTO, CANCELAMENTO
                valor DECIMAL(10,2) NOT NULL,
                forma_pagamento VARCHAR(50),
                referencia_id INT, -- ID da venda ou outro documento
                observacao TEXT,
                data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_id INT NOT NULL,
                FOREIGN KEY (caixa_id) REFERENCES caixas(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela para fechamento de caixa
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS caixa_fechamentos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                caixa_id INT NOT NULL,
                data_abertura TIMESTAMP NOT NULL,
                data_fechamento TIMESTAMP NOT NULL,
                usuario_abertura_id INT NOT NULL,
                usuario_fechamento_id INT NOT NULL,
                
                -- Valores informados na contagem
                valor_informado_dinheiro DECIMAL(10,2) NOT NULL,
                valor_informado_pix DECIMAL(10,2) NOT NULL,
                valor_informado_cartao_credito DECIMAL(10,2) NOT NULL,
                valor_informado_cartao_debito DECIMAL(10,2) NOT NULL,
                valor_informado_outros DECIMAL(10,2) NOT NULL,
                
                -- Valores calculados pelo sistema
                valor_sistema_dinheiro DECIMAL(10,2) NOT NULL,
                valor_sistema_pix DECIMAL(10,2) NOT NULL,
                valor_sistema_cartao_credito DECIMAL(10,2) NOT NULL,
                valor_sistema_cartao_debito DECIMAL(10,2) NOT NULL,
                valor_sistema_outros DECIMAL(10,2) NOT NULL,
                
                -- Totalizadores
                total_vendas INT NOT NULL,
                total_cancelamentos INT NOT NULL,
                total_descontos DECIMAL(10,2) NOT NULL,
                total_acrescimos DECIMAL(10,2) NOT NULL,
                total_sangrias DECIMAL(10,2) NOT NULL,
                total_suprimentos DECIMAL(10,2) NOT NULL,
                
                -- Diferenças e ajustes
                diferenca_dinheiro DECIMAL(10,2) NOT NULL,
                diferenca_justificativa TEXT,
                conferido_por_id INT,
                
                status VARCHAR(20) NOT NULL, -- ABERTO, FECHADO, CONFERIDO, AJUSTADO
                observacoes TEXT,
                
                FOREIGN KEY (caixa_id) REFERENCES caixas(id),
                FOREIGN KEY (usuario_abertura_id) REFERENCES usuarios(id),
                FOREIGN KEY (usuario_fechamento_id) REFERENCES usuarios(id),
                FOREIGN KEY (conferido_por_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela para detalhe do fechamento de caixa
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS caixa_fechamento_detalhes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                fechamento_id INT NOT NULL,
                tipo_registro VARCHAR(50) NOT NULL, -- VENDA, SANGRIA, SUPRIMENTO, CANCELAMENTO
                documento_id INT,
                valor DECIMAL(10,2) NOT NULL,
                forma_pagamento VARCHAR(50),
                data_movimento TIMESTAMP NOT NULL,
                usuario_id INT NOT NULL,
                observacao TEXT,
                FOREIGN KEY (fechamento_id) REFERENCES caixa_fechamentos(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ Tabelas de fechamento de caixa criadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar tabelas de fechamento de caixa:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createCaixaFechamento();
}

module.exports = createCaixaFechamento;