-- Migration: Sistema de Compras e NF-e de Entrada
-- Data: 2025-11-11
-- Descrição: Módulos de Pedidos de Compra, Entrada de Mercadorias e Gestão de NF-e
-- ORDEM CORRETA: Pedidos → NF-e → Entradas → Manifestações → Cotações

-- ============================================
-- 1. PEDIDOS DE COMPRA
-- ============================================

CREATE TABLE IF NOT EXISTS pedidos_compra (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  numero_pedido VARCHAR(20) UNIQUE NOT NULL,
  
  -- Fornecedor
  fornecedor_id INT UNSIGNED NOT NULL,
  fornecedor_contato VARCHAR(255),
  fornecedor_email VARCHAR(255),
  fornecedor_telefone VARCHAR(20),
  
  -- Datas
  data_pedido DATE NOT NULL,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  prazo_entrega_dias INT,
  
  -- Valores
  valor_produtos DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  status ENUM(
    'RASCUNHO',
    'AGUARDANDO_APROVACAO',
    'APROVADO',
    'ENVIADO',
    'PARCIALMENTE_RECEBIDO',
    'RECEBIDO',
    'CANCELADO'
  ) DEFAULT 'RASCUNHO',
  
  -- Condições
  forma_pagamento VARCHAR(100),
  condicao_pagamento VARCHAR(255),
  prazo_pagamento_dias INT,
  
  -- Entrega
  local_entrega TEXT,
  observacoes TEXT,
  
  -- Aprovação
  requer_aprovacao BOOLEAN DEFAULT TRUE,
  aprovado_por_id INT UNSIGNED,
  data_aprovacao DATETIME,
  motivo_reprovacao TEXT,
  
  -- Auditoria
  usuario_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_numero (numero_pedido),
  INDEX idx_fornecedor (fornecedor_id),
  INDEX idx_data (data_pedido),
  INDEX idx_status (status),
  INDEX idx_usuario (usuario_id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (aprovado_por_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  pedido_compra_id INT UNSIGNED NOT NULL,
  numero_item INT NOT NULL,
  
  -- Produto
  produto_id INT UNSIGNED NOT NULL,
  codigo_produto VARCHAR(50) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  unidade VARCHAR(10) NOT NULL,
  
  -- Quantidades
  quantidade_solicitada DECIMAL(15,4) NOT NULL,
  quantidade_recebida DECIMAL(15,4) DEFAULT 0,
  quantidade_pendente DECIMAL(15,4) NOT NULL,
  
  -- Valores
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Status
  status ENUM('PENDENTE', 'PARCIAL', 'RECEBIDO', 'CANCELADO') DEFAULT 'PENDENTE',
  
  -- Observações
  observacoes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_pedido (pedido_compra_id),
  INDEX idx_produto (produto_id),
  FOREIGN KEY (pedido_compra_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. NOTAS FISCAIS DE ENTRADA (NF-e)
-- ============================================

CREATE TABLE IF NOT EXISTS nfe_entrada (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  chave_acesso VARCHAR(44) UNIQUE NOT NULL,
  numero_nfe VARCHAR(20) NOT NULL,
  serie VARCHAR(3) NOT NULL,
  
  -- Fornecedor (Emitente)
  fornecedor_id INT UNSIGNED,
  fornecedor_cnpj VARCHAR(18) NOT NULL,
  fornecedor_nome VARCHAR(255) NOT NULL,
  
  -- Dados da NF-e
  data_emissao DATETIME NOT NULL,
  data_entrada DATETIME,
  tipo_operacao ENUM('ENTRADA', 'SAIDA') DEFAULT 'ENTRADA',
  natureza_operacao VARCHAR(100),
  
  -- Valores
  valor_produtos DECIMAL(15,2) NOT NULL,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- XML
  xml_completo LONGTEXT,
  xml_url VARCHAR(500),
  
  -- Status e Manifestação
  status_download ENUM('PENDENTE', 'BAIXADO', 'ERRO') DEFAULT 'PENDENTE',
  status_manifestacao ENUM(
    'SEM_MANIFESTACAO',
    'CIENCIA_EMISSAO',
    'CONFIRMACAO_OPERACAO', 
    'DESCONHECIMENTO_OPERACAO',
    'OPERACAO_NAO_REALIZADA'
  ) DEFAULT 'SEM_MANIFESTACAO',
  data_manifestacao DATETIME,
  protocolo_manifestacao VARCHAR(50),
  
  -- Entrada no sistema
  status_entrada ENUM('PENDENTE', 'CONFERIDO', 'IMPORTADO', 'CANCELADO') DEFAULT 'PENDENTE',
  pedido_compra_id INT UNSIGNED,
  entrada_mercadoria_id INT UNSIGNED,
  
  -- Observações e divergências
  observacoes TEXT,
  divergencias JSON,
  
  -- Auditoria
  usuario_download_id INT UNSIGNED,
  usuario_manifestacao_id INT UNSIGNED,
  usuario_importacao_id INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_chave (chave_acesso),
  INDEX idx_fornecedor (fornecedor_id),
  INDEX idx_data_emissao (data_emissao),
  INDEX idx_status (status_entrada),
  INDEX idx_pedido (pedido_compra_id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (pedido_compra_id) REFERENCES pedidos_compra(id),
  FOREIGN KEY (usuario_download_id) REFERENCES usuarios(id),
  FOREIGN KEY (usuario_manifestacao_id) REFERENCES usuarios(id),
  FOREIGN KEY (usuario_importacao_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nfe_entrada_itens (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nfe_entrada_id INT UNSIGNED NOT NULL,
  numero_item INT NOT NULL,
  
  -- Produto
  produto_id INT UNSIGNED,
  codigo_produto VARCHAR(50) NOT NULL,
  gtin VARCHAR(14),
  descricao VARCHAR(255) NOT NULL,
  ncm VARCHAR(8),
  cfop VARCHAR(4),
  unidade VARCHAR(10),
  
  -- Quantidades
  quantidade DECIMAL(15,4) NOT NULL,
  quantidade_conferida DECIMAL(15,4),
  quantidade_recebida DECIMAL(15,4),
  
  -- Valores unitários
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_unitario_comercial DECIMAL(15,4),
  valor_unitario_tributavel DECIMAL(15,4),
  
  -- Valores totais
  valor_bruto DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Impostos
  icms_valor DECIMAL(15,2) DEFAULT 0,
  icms_aliquota DECIMAL(5,2) DEFAULT 0,
  ipi_valor DECIMAL(15,2) DEFAULT 0,
  ipi_aliquota DECIMAL(5,2) DEFAULT 0,
  pis_valor DECIMAL(15,2) DEFAULT 0,
  cofins_valor DECIMAL(15,2) DEFAULT 0,
  
  -- Conferência
  status_conferencia ENUM('PENDENTE', 'OK', 'DIVERGENCIA') DEFAULT 'PENDENTE',
  divergencias JSON,
  
  -- Vínculos
  pedido_compra_item_id INT UNSIGNED,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_nfe (nfe_entrada_id),
  INDEX idx_produto (produto_id),
  INDEX idx_pedido_item (pedido_compra_item_id),
  FOREIGN KEY (nfe_entrada_id) REFERENCES nfe_entrada(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (pedido_compra_item_id) REFERENCES pedidos_compra_itens(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. ENTRADAS DE MERCADORIAS
-- ============================================

CREATE TABLE IF NOT EXISTS entradas_mercadorias (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  numero_entrada VARCHAR(20) UNIQUE NOT NULL,
  
  -- Tipo e origem
  tipo_entrada ENUM('MANUAL', 'NFE', 'PEDIDO_COMPRA') NOT NULL,
  origem VARCHAR(100),
  
  -- Vínculos
  fornecedor_id INT UNSIGNED NOT NULL,
  pedido_compra_id INT UNSIGNED,
  nfe_entrada_id INT UNSIGNED,
  
  -- Datas
  data_entrada DATE NOT NULL,
  data_lancamento DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Valores
  valor_produtos DECIMAL(15,2) NOT NULL,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Status
  status ENUM('RASCUNHO', 'CONFERIDO', 'FINALIZADO', 'CANCELADO') DEFAULT 'RASCUNHO',
  conferido BOOLEAN DEFAULT FALSE,
  conferido_por_id INT UNSIGNED,
  data_conferencia DATETIME,
  
  -- Observações
  observacoes TEXT,
  divergencias JSON,
  
  -- Auditoria
  usuario_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_numero (numero_entrada),
  INDEX idx_fornecedor (fornecedor_id),
  INDEX idx_data (data_entrada),
  INDEX idx_pedido (pedido_compra_id),
  INDEX idx_nfe (nfe_entrada_id),
  INDEX idx_status (status),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (pedido_compra_id) REFERENCES pedidos_compra(id),
  FOREIGN KEY (nfe_entrada_id) REFERENCES nfe_entrada(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (conferido_por_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entradas_mercadorias_itens (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  entrada_mercadoria_id INT UNSIGNED NOT NULL,
  numero_item INT NOT NULL,
  
  -- Produto
  produto_id INT UNSIGNED NOT NULL,
  codigo_produto VARCHAR(50) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  unidade VARCHAR(10) NOT NULL,
  
  -- Quantidades
  quantidade DECIMAL(15,4) NOT NULL,
  quantidade_conferida DECIMAL(15,4),
  
  -- Valores
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Vínculos
  pedido_compra_item_id INT UNSIGNED,
  nfe_entrada_item_id INT UNSIGNED,
  
  -- Lote e validade (opcional)
  lote VARCHAR(50),
  data_validade DATE,
  data_fabricacao DATE,
  
  -- Observações
  observacoes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_entrada (entrada_mercadoria_id),
  INDEX idx_produto (produto_id),
  INDEX idx_pedido_item (pedido_compra_item_id),
  INDEX idx_nfe_item (nfe_entrada_item_id),
  FOREIGN KEY (entrada_mercadoria_id) REFERENCES entradas_mercadorias(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (pedido_compra_item_id) REFERENCES pedidos_compra_itens(id),
  FOREIGN KEY (nfe_entrada_item_id) REFERENCES nfe_entrada_itens(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. MANIFESTAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS manifestacoes_destinatario (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nfe_entrada_id INT UNSIGNED NOT NULL,
  tipo_evento ENUM(
    'CIENCIA_EMISSAO',
    'CONFIRMACAO_OPERACAO',
    'DESCONHECIMENTO_OPERACAO',
    'OPERACAO_NAO_REALIZADA'
  ) NOT NULL,
  justificativa TEXT,
  protocolo VARCHAR(50),
  data_evento DATETIME NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  resultado ENUM('SUCESSO', 'ERRO', 'PENDENTE') DEFAULT 'PENDENTE',
  mensagem_retorno TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_nfe (nfe_entrada_id),
  INDEX idx_usuario (usuario_id),
  FOREIGN KEY (nfe_entrada_id) REFERENCES nfe_entrada(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. COTAÇÕES (futuro)
-- ============================================

CREATE TABLE IF NOT EXISTS cotacoes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  numero_cotacao VARCHAR(20) UNIQUE NOT NULL,
  data_cotacao DATE NOT NULL,
  data_validade DATE,
  status ENUM('ABERTA', 'EM_ANALISE', 'FECHADA', 'CANCELADA') DEFAULT 'ABERTA',
  observacoes TEXT,
  usuario_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_numero (numero_cotacao),
  INDEX idx_status (status),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cotacoes_itens (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cotacao_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NOT NULL,
  quantidade DECIMAL(15,4) NOT NULL,
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cotacao (cotacao_id),
  INDEX idx_produto (produto_id),
  FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cotacoes_fornecedores (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cotacao_item_id INT UNSIGNED NOT NULL,
  fornecedor_id INT UNSIGNED NOT NULL,
  valor_unitario DECIMAL(15,4),
  prazo_entrega_dias INT,
  condicao_pagamento VARCHAR(255),
  observacoes TEXT,
  selecionado BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cotacao_item (cotacao_item_id),
  INDEX idx_fornecedor (fornecedor_id),
  FOREIGN KEY (cotacao_item_id) REFERENCES cotacoes_itens(id) ON DELETE CASCADE,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
