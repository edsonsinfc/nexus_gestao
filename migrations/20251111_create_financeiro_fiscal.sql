-- ============================================
-- MIGRATION: Sistema Financeiro e Fiscal
-- Data: 2025-11-11
-- Descrição: Tabelas para DRE, Fluxo de Caixa, 
--            Conciliação Bancária e Exportação XML
-- ============================================

USE nexus_dev;

-- ============================================
-- 1. CONTAS BANCÁRIAS
-- ============================================
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  banco_codigo VARCHAR(10) NOT NULL COMMENT 'Código do banco (001, 237, etc)',
  banco_nome VARCHAR(100) NOT NULL,
  agencia VARCHAR(20) NOT NULL,
  agencia_digito VARCHAR(2),
  conta VARCHAR(20) NOT NULL,
  conta_digito VARCHAR(2),
  tipo_conta ENUM('CORRENTE', 'POUPANCA', 'APLICACAO', 'CARTEIRA') DEFAULT 'CORRENTE',
  saldo_inicial DECIMAL(15,2) DEFAULT 0.00,
  saldo_atual DECIMAL(15,2) DEFAULT 0.00,
  data_saldo_inicial DATE,
  ativa BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_banco (banco_codigo),
  INDEX idx_ativa (ativa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. CATEGORIAS FINANCEIRAS (para DRE e Fluxo)
-- ============================================
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo ENUM('RECEITA', 'DESPESA', 'CUSTO') NOT NULL,
  categoria_pai_id INT UNSIGNED,
  nivel INT DEFAULT 1 COMMENT 'Nível hierárquico (1=principal, 2=subcategoria)',
  codigo VARCHAR(20) COMMENT 'Código contábil',
  dre_grupo ENUM('RECEITA_BRUTA', 'DEDUCOES', 'CMV', 'DESPESA_OPERACIONAL', 'DESPESA_FINANCEIRA', 'RECEITA_FINANCEIRA', 'OUTRAS') COMMENT 'Grupo no DRE',
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_pai_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  INDEX idx_tipo (tipo),
  INDEX idx_dre_grupo (dre_grupo),
  INDEX idx_ativa (ativa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. LANÇAMENTOS FINANCEIROS
-- ============================================
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('RECEITA', 'DESPESA', 'TRANSFERENCIA') NOT NULL,
  categoria_id INT UNSIGNED,
  conta_bancaria_id INT UNSIGNED,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_lancamento DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status ENUM('PENDENTE', 'PAGO', 'CANCELADO') DEFAULT 'PENDENTE',
  forma_pagamento VARCHAR(50),
  numero_documento VARCHAR(50) COMMENT 'Número do cheque, boleto, etc',
  pessoa_id INT UNSIGNED COMMENT 'Cliente/Fornecedor',
  pessoa_tipo ENUM('CLIENTE', 'FORNECEDOR', 'OUTRO'),
  venda_id INT UNSIGNED COMMENT 'Referência a venda (se for receita de venda)',
  nfce_id INT UNSIGNED COMMENT 'Referência a NFC-e',
  nfe_id INT UNSIGNED COMMENT 'Referência a NF-e',
  pedido_compra_id INT UNSIGNED COMMENT 'Referência a pedido de compra',
  conciliado BOOLEAN DEFAULT FALSE,
  conciliacao_id INT UNSIGNED,
  observacoes TEXT,
  usuario_id INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_tipo (tipo),
  INDEX idx_status (status),
  INDEX idx_data_lancamento (data_lancamento),
  INDEX idx_data_vencimento (data_vencimento),
  INDEX idx_conciliado (conciliado),
  INDEX idx_categoria (categoria_id),
  INDEX idx_conta (conta_bancaria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. EXTRATOS BANCÁRIOS (upload OFX/CSV)
-- ============================================
CREATE TABLE IF NOT EXISTS extratos_bancarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conta_bancaria_id INT UNSIGNED NOT NULL,
  data_extrato DATE NOT NULL,
  tipo_movimento ENUM('DEBITO', 'CREDITO') NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  descricao VARCHAR(255),
  documento VARCHAR(50),
  saldo_dia DECIMAL(15,2),
  conciliado BOOLEAN DEFAULT FALSE,
  conciliacao_id INT UNSIGNED,
  arquivo_origem VARCHAR(255) COMMENT 'Nome do arquivo OFX/CSV',
  hash_linha VARCHAR(64) COMMENT 'Hash para evitar duplicatas',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  UNIQUE KEY unique_extrato (conta_bancaria_id, data_extrato, valor, hash_linha),
  INDEX idx_conta_data (conta_bancaria_id, data_extrato),
  INDEX idx_conciliado (conciliado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. CONCILIAÇÕES BANCÁRIAS
-- ============================================
CREATE TABLE IF NOT EXISTS conciliacoes_bancarias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conta_bancaria_id INT UNSIGNED NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  saldo_inicial DECIMAL(15,2) NOT NULL,
  saldo_final DECIMAL(15,2) NOT NULL,
  saldo_extrato DECIMAL(15,2) NOT NULL,
  diferenca DECIMAL(15,2) DEFAULT 0.00,
  status ENUM('EM_ANDAMENTO', 'CONCLUIDA', 'COM_DIVERGENCIA') DEFAULT 'EM_ANDAMENTO',
  total_lancamentos_conciliados INT DEFAULT 0,
  total_extrato_conciliado INT DEFAULT 0,
  observacoes TEXT,
  usuario_id INT UNSIGNED,
  data_conciliacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_conta_periodo (conta_bancaria_id, periodo_inicio, periodo_fim),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. ITENS DA CONCILIAÇÃO (matching)
-- ============================================
CREATE TABLE IF NOT EXISTS conciliacoes_itens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conciliacao_id INT UNSIGNED NOT NULL,
  lancamento_id INT UNSIGNED,
  extrato_id INT UNSIGNED,
  tipo_matching ENUM('AUTOMATICO', 'MANUAL') DEFAULT 'MANUAL',
  diferenca DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Se houver diferença de valor',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conciliacao_id) REFERENCES conciliacoes_bancarias(id) ON DELETE CASCADE,
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos_financeiros(id) ON DELETE CASCADE,
  FOREIGN KEY (extrato_id) REFERENCES extratos_bancarios(id) ON DELETE CASCADE,
  INDEX idx_conciliacao (conciliacao_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. ENVIOS DE XML PARA CONTADOR
-- ============================================
CREATE TABLE IF NOT EXISTS xml_envios_contador (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  email_contador VARCHAR(255) NOT NULL,
  email_copia VARCHAR(255),
  quantidade_nfce INT DEFAULT 0,
  quantidade_nfe INT DEFAULT 0,
  tamanho_arquivo_bytes BIGINT COMMENT 'Tamanho do ZIP em bytes',
  arquivo_zip_path VARCHAR(500) COMMENT 'Caminho do arquivo ZIP gerado',
  status ENUM('PENDENTE', 'PROCESSANDO', 'ENVIADO', 'ERRO') DEFAULT 'PENDENTE',
  erro_mensagem TEXT,
  data_envio TIMESTAMP,
  usuario_id INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_periodo (periodo_inicio, periodo_fim),
  INDEX idx_status (status),
  INDEX idx_data_envio (data_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. DETALHES DOS XMLs ENVIADOS
-- ============================================
CREATE TABLE IF NOT EXISTS xml_envios_detalhes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  envio_id INT UNSIGNED NOT NULL,
  tipo_documento ENUM('NFCE', 'NFE', 'NFSE') NOT NULL,
  documento_id INT UNSIGNED NOT NULL COMMENT 'ID da NFC-e ou NF-e',
  numero_documento VARCHAR(20),
  serie VARCHAR(5),
  chave_acesso VARCHAR(44),
  data_emissao TIMESTAMP,
  valor_total DECIMAL(15,2),
  cfop VARCHAR(10),
  situacao_tributaria VARCHAR(10),
  arquivo_xml_nome VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (envio_id) REFERENCES xml_envios_contador(id) ON DELETE CASCADE,
  INDEX idx_envio (envio_id),
  INDEX idx_tipo_documento (tipo_documento, documento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. CACHE DE ESTATÍSTICAS FISCAIS (performance)
-- ============================================
CREATE TABLE IF NOT EXISTS estatisticas_fiscais_cache (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  periodo_mes INT NOT NULL COMMENT 'Formato YYYYMM',
  tipo_documento ENUM('NFCE', 'NFE') NOT NULL,
  cfop VARCHAR(10) NOT NULL,
  situacao_tributaria VARCHAR(10),
  quantidade_notas INT DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0.00,
  base_calculo_icms DECIMAL(15,2) DEFAULT 0.00,
  valor_icms DECIMAL(15,2) DEFAULT 0.00,
  base_calculo_st DECIMAL(15,2) DEFAULT 0.00,
  valor_icms_st DECIMAL(15,2) DEFAULT 0.00,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_estatistica (periodo_mes, tipo_documento, cfop, situacao_tributaria),
  INDEX idx_periodo (periodo_mes),
  INDEX idx_cfop (cfop),
  INDEX idx_st (situacao_tributaria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERIR CATEGORIAS FINANCEIRAS PADRÃO
-- ============================================

-- RECEITAS
INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
('Receita de Vendas', 'RECEITA', 1, 'RECEITA_BRUTA', '3.1.1'),
('Receita de Serviços', 'RECEITA', 1, 'RECEITA_BRUTA', '3.1.2'),
('Devoluções e Cancelamentos', 'RECEITA', 1, 'DEDUCOES', '3.2.1'),
('Descontos Concedidos', 'RECEITA', 1, 'DEDUCOES', '3.2.2'),
('Receitas Financeiras', 'RECEITA', 1, 'RECEITA_FINANCEIRA', '3.3.1'),
('Outras Receitas', 'RECEITA', 1, 'OUTRAS', '3.9.1');

-- CUSTOS
INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
('Custo de Mercadorias Vendidas (CMV)', 'CUSTO', 1, 'CMV', '4.1.1'),
('Custo de Materiais', 'CUSTO', 1, 'CMV', '4.1.2'),
('Custo de Serviços', 'CUSTO', 1, 'CMV', '4.1.3');

-- DESPESAS OPERACIONAIS
INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
('Despesas com Pessoal', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.1'),
('Salários', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.1.1'),
('Encargos Sociais', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.1.2'),
('Benefícios', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.1.3'),
('Despesas Administrativas', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.2'),
('Aluguel', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.2.1'),
('Água, Luz e Telefone', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.2.2'),
('Material de Escritório', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.2.3'),
('Despesas Comerciais', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.3'),
('Marketing e Publicidade', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.3.1'),
('Comissões de Vendas', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.3.2'),
('Despesas com Veículos', 'DESPESA', 1, 'DESPESA_OPERACIONAL', '5.1.4'),
('Combustível', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.4.1'),
('Manutenção', 'DESPESA', 2, 'DESPESA_OPERACIONAL', '5.1.4.2');

-- DESPESAS FINANCEIRAS
INSERT INTO categorias_financeiras (nome, tipo, nivel, dre_grupo, codigo) VALUES
('Juros Pagos', 'DESPESA', 1, 'DESPESA_FINANCEIRA', '5.2.1'),
('Tarifas Bancárias', 'DESPESA', 1, 'DESPESA_FINANCEIRA', '5.2.2'),
('IOF', 'DESPESA', 1, 'DESPESA_FINANCEIRA', '5.2.3');

-- Atualizar categoria_pai_id para subcategorias
UPDATE categorias_financeiras SET categoria_pai_id = (SELECT id FROM (SELECT id FROM categorias_financeiras WHERE nome = 'Despesas com Pessoal') t) WHERE nome IN ('Salários', 'Encargos Sociais', 'Benefícios');
UPDATE categorias_financeiras SET categoria_pai_id = (SELECT id FROM (SELECT id FROM categorias_financeiras WHERE nome = 'Despesas Administrativas') t) WHERE nome IN ('Aluguel', 'Água, Luz e Telefone', 'Material de Escritório');
UPDATE categorias_financeiras SET categoria_pai_id = (SELECT id FROM (SELECT id FROM categorias_financeiras WHERE nome = 'Despesas Comerciais') t) WHERE nome IN ('Marketing e Publicidade', 'Comissões de Vendas');
UPDATE categorias_financeiras SET categoria_pai_id = (SELECT id FROM (SELECT id FROM categorias_financeiras WHERE nome = 'Despesas com Veículos') t) WHERE nome IN ('Combustível', 'Manutenção');

-- ============================================
-- MIGRATION CONCLUÍDA
-- ============================================
SELECT 'Migration 20251111_create_financeiro_fiscal.sql executada com sucesso!' as status;
