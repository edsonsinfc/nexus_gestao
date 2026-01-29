const mysql = require('mysql2/promise');
require('dotenv').config();

async function createEntregasTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Tabela principal de entregas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS entregas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                venda_id INT NOT NULL,
                tipo_entrega ENUM('TOTAL', 'PARCIAL') NOT NULL,
                status ENUM('PENDENTE', 'EM_SEPARACAO', 'SEPARADO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_separacao DATETIME,
                data_entrega DATETIME,
                previsao_entrega DATE,
                motorista VARCHAR(100),
                placa_veiculo VARCHAR(10),
                telefone_contato VARCHAR(20),
                endereco_entrega TEXT,
                observacoes TEXT,
                usuario_criacao_id INT NOT NULL,
                usuario_separacao_id INT,
                usuario_entrega_id INT,
                assinatura_cliente MEDIUMBLOB,
                comprovante_foto MEDIUMBLOB,
                FOREIGN KEY (venda_id) REFERENCES vendas(id),
                FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id),
                FOREIGN KEY (usuario_separacao_id) REFERENCES usuarios(id),
                FOREIGN KEY (usuario_entrega_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de itens da entrega
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS entrega_itens (
                id INT PRIMARY KEY AUTO_INCREMENT,
                entrega_id INT NOT NULL,
                venda_item_id INT NOT NULL,
                produto_id INT NOT NULL,
                quantidade_vendida DECIMAL(10,3) NOT NULL,
                quantidade_entregar DECIMAL(10,3) NOT NULL,
                quantidade_entregue DECIMAL(10,3) DEFAULT 0,
                unidade VARCHAR(5) NOT NULL,
                status ENUM('PENDENTE', 'PARCIAL', 'ENTREGUE') NOT NULL DEFAULT 'PENDENTE',
                observacao TEXT,
                data_ultima_entrega DATETIME,
                usuario_ultima_entrega_id INT,
                FOREIGN KEY (entrega_id) REFERENCES entregas(id),
                FOREIGN KEY (venda_item_id) REFERENCES venda_itens(id),
                FOREIGN KEY (produto_id) REFERENCES produtos(id),
                FOREIGN KEY (usuario_ultima_entrega_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de histórico de entregas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS entrega_historicos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                entrega_id INT NOT NULL,
                entrega_item_id INT,
                tipo_movimento ENUM('SEPARACAO', 'ENTREGA', 'CANCELAMENTO', 'AJUSTE') NOT NULL,
                quantidade DECIMAL(10,3),
                status_anterior VARCHAR(20),
                status_novo VARCHAR(20),
                observacao TEXT,
                data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_id INT NOT NULL,
                FOREIGN KEY (entrega_id) REFERENCES entregas(id),
                FOREIGN KEY (entrega_item_id) REFERENCES entrega_itens(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de controle de estoque por entrega
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS entrega_estoque_movimentos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                entrega_id INT NOT NULL,
                entrega_item_id INT NOT NULL,
                produto_id INT NOT NULL,
                tipo_movimento ENUM('SAIDA', 'ENTRADA', 'AJUSTE') NOT NULL,
                quantidade DECIMAL(10,3) NOT NULL,
                data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_id INT NOT NULL,
                observacao TEXT,
                FOREIGN KEY (entrega_id) REFERENCES entregas(id),
                FOREIGN KEY (entrega_item_id) REFERENCES entrega_itens(id),
                FOREIGN KEY (produto_id) REFERENCES produtos(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ Tabelas de entregas criadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar tabelas de entregas:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createEntregasTables();
}

module.exports = createEntregasTables;