const mysql = require('mysql2/promise');
require('dotenv').config();

async function createNFCeTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        // Tabela de dados fiscais para NFC-e (complementa as vendas existentes)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS nfce (
                id INT PRIMARY KEY AUTO_INCREMENT,
                numero_sequencial INT NOT NULL,
                serie INT DEFAULT 1,
                chave_acesso VARCHAR(44) UNIQUE,
                
                -- Relacionamento com venda existente
                venda_id INT NOT NULL,
                
                -- Dados fiscais obrigatórios DF
                cnpj_emitente VARCHAR(18) NOT NULL,
                inscricao_estadual VARCHAR(20) NOT NULL,
                razao_social_emitente VARCHAR(150) NOT NULL,
                nome_fantasia_emitente VARCHAR(100),
                endereco_emitente TEXT NOT NULL,
                municipio_emitente VARCHAR(100) NOT NULL,
                uf_emitente CHAR(2) DEFAULT 'DF',
                cep_emitente VARCHAR(10) NOT NULL,
                
                -- Dados do consumidor (quando informado)
                cpf_cnpj_consumidor VARCHAR(18),
                nome_consumidor VARCHAR(150),
                endereco_consumidor TEXT,
                
                -- Impostos (DF - Simples Nacional)
                base_calculo_icms DECIMAL(15,2) DEFAULT 0.00,
                valor_icms DECIMAL(15,2) DEFAULT 0.00,
                valor_pis DECIMAL(15,2) DEFAULT 0.00,
                valor_cofins DECIMAL(15,2) DEFAULT 0.00,
                
                -- Informações adicionais
                observacoes TEXT,
                informacoes_adicionais_fisco TEXT,
                
                -- Controle de status
                status ENUM('PENDENTE', 'EMITIDA', 'CANCELADA', 'INUTILIZADA') DEFAULT 'PENDENTE',
                protocolo_autorizacao VARCHAR(20),
                data_autorizacao DATETIME,
                motivo_cancelamento TEXT,
                
                -- Dados do cupom
                logo_empresa LONGBLOB,
                layout_personalizado JSON,
                
                -- Auditoria
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                usuario_criacao_id INT NOT NULL,
                usuario_cancelamento_id INT,
                
                INDEX idx_numero_serie (numero_sequencial, serie),
                INDEX idx_chave_acesso (chave_acesso),
                INDEX idx_venda (venda_id),
                INDEX idx_data_emissao (created_at),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de dados fiscais dos itens (complementa itens_venda existente)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS nfce_itens_fiscal (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nfce_id INT NOT NULL,
                item_venda_id INT NOT NULL,
                numero_item INT NOT NULL,
                
                -- Dados fiscais do produto
                codigo_produto VARCHAR(50) NOT NULL,
                descricao_produto VARCHAR(200) NOT NULL,
                codigo_barras VARCHAR(50),
                ncm VARCHAR(20),
                cfop VARCHAR(10) DEFAULT '5102',
                unidade VARCHAR(10) DEFAULT 'UN',
                
                -- Dados fiscais do item
                origem_produto TINYINT DEFAULT 0,
                cst_icms VARCHAR(3) DEFAULT '102', -- Simples Nacional
                aliquota_icms DECIMAL(5,2) DEFAULT 0.00,
                valor_icms DECIMAL(15,2) DEFAULT 0.00,
                
                cst_pis VARCHAR(3) DEFAULT '49',
                aliquota_pis DECIMAL(5,4) DEFAULT 0.00,
                valor_pis DECIMAL(15,2) DEFAULT 0.00,
                
                cst_cofins VARCHAR(3) DEFAULT '49',
                aliquota_cofins DECIMAL(5,4) DEFAULT 0.00,
                valor_cofins DECIMAL(15,2) DEFAULT 0.00,
                
                -- Informações adicionais do item
                informacoes_adicionais TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_nfce (nfce_id),
                INDEX idx_item_venda (item_venda_id),
                UNIQUE KEY uk_nfce_item (nfce_id, numero_item)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de configurações fiscais da empresa
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
                id INT PRIMARY KEY AUTO_INCREMENT,
                
                -- Dados da empresa emitente
                cnpj VARCHAR(18) NOT NULL,
                inscricao_estadual VARCHAR(20) NOT NULL,
                razao_social VARCHAR(150) NOT NULL,
                nome_fantasia VARCHAR(100),
                
                -- Endereço completo
                logradouro VARCHAR(200) NOT NULL,
                numero VARCHAR(20) NOT NULL,
                complemento VARCHAR(100),
                bairro VARCHAR(100) NOT NULL,
                municipio VARCHAR(100) NOT NULL,
                uf CHAR(2) NOT NULL,
                cep VARCHAR(10) NOT NULL,
                codigo_municipio VARCHAR(10) NOT NULL,
                
                -- Contato
                telefone VARCHAR(20),
                email VARCHAR(100),
                
                -- Configurações fiscais
                regime_tributario ENUM('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL') DEFAULT 'SIMPLES_NACIONAL',
                codigo_regime_tributario TINYINT DEFAULT 1, -- 1=Simples Nacional
                ambiente_nfce ENUM('PRODUCAO', 'HOMOLOGACAO') DEFAULT 'HOMOLOGACAO',
                
                -- Numeração
                serie_nfce INT DEFAULT 1,
                proximo_numero INT DEFAULT 1,
                
                -- Certificado digital (se houver)
                certificado_a1 LONGBLOB,
                senha_certificado VARCHAR(255),
                
                -- Logo da empresa
                logo LONGBLOB,
                
                -- Configurações do cupom
                observacoes_padrao TEXT,
                informacoes_complementares TEXT,
                
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Inserir configuração inicial para DF
        await connection.execute(`
            INSERT IGNORE INTO configuracoes_fiscais (
                cnpj, inscricao_estadual, razao_social, nome_fantasia,
                logradouro, numero, bairro, municipio, uf, cep, codigo_municipio,
                telefone, email, observacoes_padrao
            ) VALUES (
                '00.000.000/0001-00', '00000000001', 'NEXUS GESTAO LTDA', 'Nexus Gestão',
                'SCS QUADRA 01 BLOCO A', '123', 'ASA SUL', 'BRASILIA', 'DF', '70000-000', '5300108',
                '(61) 3333-4444', 'contato@nexusgestao.com.br',
                'DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA\\n\\nConsulte pela chave de acesso em:\\nhttps://dec.fazenda.df.gov.br/ConsultarNFCe.aspx'
            );
        `);

        console.log('✅ Tabelas NFC-e criadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar tabelas NFC-e:', error);
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