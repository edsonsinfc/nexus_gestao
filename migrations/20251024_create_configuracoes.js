const mysql = require('mysql2/promise');
require('dotenv').config();

async function createConfiguracoes() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        // Criar tabela de configurações
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                chave VARCHAR(50) NOT NULL UNIQUE,
                valor TEXT,
                descricao VARCHAR(255),
                categoria VARCHAR(50) NOT NULL,
                requer_reinicio BOOLEAN DEFAULT FALSE,
                data_modificacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                usuario_modificacao INT,
                FOREIGN KEY (usuario_modificacao) REFERENCES usuarios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Inserir configurações padrão
        const configPadrao = [
            // Dados da Empresa
            ['empresa_nome', '', 'Nome da empresa', 'empresa'],
            ['empresa_cnpj', '', 'CNPJ da empresa', 'empresa'],
            ['empresa_ie', '', 'Inscrição Estadual', 'empresa'],
            ['empresa_im', '', 'Inscrição Municipal', 'empresa'],
            ['empresa_telefone', '', 'Telefone da empresa', 'empresa'],
            ['empresa_endereco', '', 'Endereço da empresa', 'empresa'],
            ['empresa_numero', '', 'Número do endereço', 'empresa'],
            ['empresa_bairro', '', 'Bairro', 'empresa'],
            ['empresa_cidade', '', 'Cidade', 'empresa'],
            ['empresa_uf', '', 'Estado', 'empresa'],
            ['empresa_cep', '', 'CEP', 'empresa'],
            ['empresa_email', '', 'E-mail da empresa', 'empresa'],
            ['empresa_regime_tributario', '1', 'Regime Tributário (1=Simples, 2=Lucro Presumido, 3=Lucro Real)', 'empresa'],
            
            // Configurações Fiscais
            ['nfce_ambiente', '2', 'Ambiente da NFCe (1=Produção, 2=Homologação)', 'fiscal'],
            ['nfce_serie', '1', 'Série da NFCe', 'fiscal'],
            ['nfce_proxima_numeracao', '1', 'Próxima numeração da NFCe', 'fiscal'],
            ['nfce_certificado_path', '', 'Caminho do certificado digital A1', 'fiscal'],
            ['nfce_certificado_senha', '', 'Senha do certificado digital', 'fiscal'],
            ['nfce_token_id', '', 'ID do Token do CSC', 'fiscal'],
            ['nfce_token', '', 'Token CSC', 'fiscal'],
            ['nfce_ultimo_nsu', '0', 'Último NSU sincronizado', 'fiscal'],
            ['nfce_ultimo_nsu_data', '', 'Data do último NSU sincronizado', 'fiscal'],
            
            // Configurações de PDV
            ['pdv_modo', 'simples', 'Modo de operação do PDV (simples, completo, fiscal)', 'pdv'],
            ['pdv_impressora', '', 'Nome da impressora não fiscal', 'pdv'],
            ['pdv_gaveta', '0', 'Habilitar gaveta de dinheiro (0=Não, 1=Sim)', 'pdv'],
            ['pdv_desconto_maximo', '10', 'Percentual máximo de desconto permitido', 'pdv'],
            ['pdv_desconto_supervisor', '0', 'Exigir supervisor para desconto acima do máximo (0=Não, 1=Sim)', 'pdv'],
            ['pdv_sangria_minima', '50', 'Valor mínimo para sangria obrigatória', 'pdv'],
            ['pdv_limite_dinheiro', '2000', 'Limite de dinheiro em caixa', 'pdv'],
            
            // Configurações de Pagamento
            ['pix_chave', '', 'Chave PIX', 'pagamento'],
            ['pix_tipo', 'cnpj', 'Tipo da chave PIX', 'pagamento'],
            ['cartao_tef_tipo', 'none', 'Tipo de TEF para cartão', 'pagamento'],
            ['cartao_tef_ip', '127.0.0.1', 'IP do TEF', 'pagamento'],
            ['cartao_tef_porta', '60906', 'Porta do TEF', 'pagamento'],
            
            // Configurações de Caixa
            ['caixa_conferencia_obrigatoria', '1', 'Exigir conferência no fechamento (0=Não, 1=Sim)', 'caixa'],
            ['caixa_sangria_automatica', '1', 'Sugerir sangria automática (0=Não, 1=Sim)', 'caixa'],
            ['caixa_fechamento_parcial', '0', 'Permitir fechamento parcial (0=Não, 1=Sim)', 'caixa'],
            ['caixa_relatorio_detalhado', '1', 'Gerar relatório detalhado no fechamento (0=Não, 1=Sim)', 'caixa']
        ];

        for (const [chave, valor, descricao, categoria] of configPadrao) {
            await connection.execute(
                'INSERT IGNORE INTO configuracoes (chave, valor, descricao, categoria) VALUES (?, ?, ?, ?)',
                [chave, valor, descricao, categoria]
            );

        for (const [chave, valor, descricao] of configPadrao) {
            await connection.execute(
                'INSERT IGNORE INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)',
                [chave, valor, descricao]
            );
        }

        console.log('✅ Tabela de configurações criada com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar tabela de configurações:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createConfiguracoes();
}

module.exports = createConfiguracoes;