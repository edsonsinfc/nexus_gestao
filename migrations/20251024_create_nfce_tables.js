const mysql = require('mysql2/promise');
require('dotenv').config();

async function createNFCeTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Tabela de NFCe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS nfce (
                id INT PRIMARY KEY AUTO_INCREMENT,
                venda_id INT NOT NULL,
                numero VARCHAR(20) NOT NULL,
                serie VARCHAR(3) NOT NULL,
                chave_acesso VARCHAR(44),
                status ENUM('PENDENTE', 'ENVIADA', 'AUTORIZADA', 'CANCELADA', 'INUTILIZADA', 'REJEITADA', 'CONTINGENCIA') NOT NULL,
                ambiente ENUM('1', '2') NOT NULL DEFAULT '2',
                protocolo_autorizacao VARCHAR(50),
                protocolo_cancelamento VARCHAR(50),
                motivo_cancelamento TEXT,
                data_emissao DATETIME NOT NULL,
                data_autorizacao DATETIME,
                data_cancelamento DATETIME,
                xml_envio MEDIUMTEXT,
                xml_retorno MEDIUMTEXT,
                danfe_html MEDIUMTEXT,
                url_consulta VARCHAR(255),
                justificativa_contingencia TEXT,
                observacoes TEXT,
                FOREIGN KEY (venda_id) REFERENCES vendas(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de layout de impressão
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS impressao_layouts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(50) NOT NULL,
                tipo ENUM('FISCAL', 'NAO_FISCAL') NOT NULL,
                conteudo TEXT NOT NULL,
                padrao BOOLEAN DEFAULT FALSE,
                observacoes TEXT,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_criacao_id INT,
                FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de contas a receber
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contas_receber (
                id INT PRIMARY KEY AUTO_INCREMENT,
                venda_id INT NOT NULL,
                cliente_id INT NOT NULL,
                valor_total DECIMAL(10,2) NOT NULL,
                valor_restante DECIMAL(10,2) NOT NULL,
                data_vencimento DATE NOT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('PENDENTE', 'PARCIAL', 'QUITADO', 'ATRASADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
                forma_pagamento VARCHAR(50) NOT NULL,
                parcelas INT NOT NULL DEFAULT 1,
                observacoes TEXT,
                usuario_criacao_id INT NOT NULL,
                FOREIGN KEY (venda_id) REFERENCES vendas(id),
                FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de parcelas de contas a receber
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contas_receber_parcelas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                conta_receber_id INT NOT NULL,
                numero_parcela INT NOT NULL,
                valor_parcela DECIMAL(10,2) NOT NULL,
                valor_pago DECIMAL(10,2) DEFAULT 0,
                data_vencimento DATE NOT NULL,
                data_pagamento DATE,
                status ENUM('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
                forma_pagamento VARCHAR(50),
                observacoes TEXT,
                FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de devoluções
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS devolucoes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                venda_id INT NOT NULL,
                cliente_id INT NOT NULL,
                tipo ENUM('DEVOLUCAO', 'TROCA') NOT NULL,
                valor_total DECIMAL(10,2) NOT NULL,
                status ENUM('PENDENTE', 'APROVADA', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_conclusao DATETIME,
                motivo TEXT NOT NULL,
                observacoes TEXT,
                usuario_criacao_id INT NOT NULL,
                usuario_aprovacao_id INT,
                FOREIGN KEY (venda_id) REFERENCES vendas(id),
                FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id),
                FOREIGN KEY (usuario_aprovacao_id) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de itens de devolução
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS devolucao_itens (
                id INT PRIMARY KEY AUTO_INCREMENT,
                devolucao_id INT NOT NULL,
                venda_item_id INT NOT NULL,
                produto_id INT NOT NULL,
                quantidade DECIMAL(10,3) NOT NULL,
                valor_unitario DECIMAL(10,2) NOT NULL,
                valor_total DECIMAL(10,2) NOT NULL,
                motivo TEXT,
                status ENUM('PENDENTE', 'APROVADO', 'REPOSTO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
                produto_troca_id INT,
                FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id),
                FOREIGN KEY (venda_item_id) REFERENCES venda_itens(id),
                FOREIGN KEY (produto_id) REFERENCES produtos(id),
                FOREIGN KEY (produto_troca_id) REFERENCES produtos(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Layouts de impressão padrão
        const layoutNaoFiscal = `
            <empresa>
                <nome>{empresa_nome}</nome>
                <endereco>{empresa_endereco}</endereco>
                <telefone>{empresa_telefone}</telefone>
                <cnpj>{empresa_cnpj}</cnpj>
            </empresa>
            <cupom>
                <titulo>CUPOM NÃO FISCAL</titulo>
                <numero>{numero_venda}</numero>
                <data>{data_venda}</data>
                <hora>{hora_venda}</hora>
            </cupom>
            <cliente>
                <nome>{cliente_nome}</nome>
                <documento>{cliente_documento}</documento>
            </cliente>
            <itens>
                <cabecalho>
                    <codigo>Código</codigo>
                    <descricao>Descrição</descricao>
                    <quantidade>Qtd</quantidade>
                    <valor>Valor</valor>
                    <total>Total</total>
                </cabecalho>
                <item>
                    <codigo>{item_codigo}</codigo>
                    <descricao>{item_descricao}</descricao>
                    <quantidade>{item_quantidade}</quantidade>
                    <valor>{item_valor}</valor>
                    <total>{item_total}</total>
                </item>
            </itens>
            <totais>
                <subtotal>{venda_subtotal}</subtotal>
                <desconto>{venda_desconto}</desconto>
                <total>{venda_total}</total>
            </totais>
            <pagamento>
                <forma>{forma_pagamento}</forma>
                <valor>{valor_pago}</valor>
                <troco>{troco}</troco>
            </pagamento>
            <rodape>
                <mensagem>Obrigado pela preferência!</mensagem>
                <operador>Operador: {operador_nome}</operador>
            </rodape>
        `;

        // Inserir layout padrão não fiscal
        await connection.execute(`
            INSERT INTO impressao_layouts (nome, tipo, conteudo, padrao) 
            VALUES ('Padrão Não Fiscal', 'NAO_FISCAL', ?, TRUE)
        `, [layoutNaoFiscal]);

        console.log('✅ Tabelas de NFCe e relacionadas criadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createNFCeTables();
}

module.exports = createNFCeTables;