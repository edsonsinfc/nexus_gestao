-- =====================================================
-- SISTEMA DE GERENCIAMENTO DE ESTOQUE PROFISSIONAL
-- =====================================================

-- Tabela de Movimentações de Estoque (Histórico Completo)
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id INT(11) NOT NULL AUTO_INCREMENT,
  produto_id INT(11) NOT NULL,
  tipo ENUM('ENTRADA', 'SAIDA', 'AJUSTE_ENTRADA', 'AJUSTE_SAIDA', 'DEVOLUCAO', 'PERDA', 'TRANSFERENCIA', 'INVENTARIO') NOT NULL,
  quantidade DECIMAL(15,4) NOT NULL,
  estoque_anterior DECIMAL(15,4) NOT NULL,
  estoque_novo DECIMAL(15,4) NOT NULL,
  
  -- Informações de custo
  custo_unitario DECIMAL(15,4) NULL,
  custo_total DECIMAL(15,4) NULL,
  
  -- Rastreabilidade
  motivo VARCHAR(100) NULL,
  observacao TEXT NULL,
  documento_referencia VARCHAR(100) NULL,
  referencia_tipo ENUM('VENDA', 'COMPRA', 'NFE', 'PEDIDO', 'DEVOLUCAO', 'AJUSTE_MANUAL', 'INVENTARIO') NULL,
  referencia_id INT(11) NULL,
  
  -- Localização (para controle de múltiplos depósitos)
  deposito_origem VARCHAR(100) NULL,
  deposito_destino VARCHAR(100) NULL,
  localizacao VARCHAR(100) NULL,
  
  -- Lote e validade (para controle de rastreabilidade)
  lote VARCHAR(50) NULL,
  data_validade DATE NULL,
  
  -- Auditoria
  usuario_id INT(11) NOT NULL,
  data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_usuario VARCHAR(45) NULL,
  
  PRIMARY KEY (id),
  KEY idx_produto (produto_id),
  KEY idx_tipo (tipo),
  KEY idx_data (data_movimentacao),
  KEY idx_usuario (usuario_id),
  KEY idx_documento (documento_referencia),
  KEY idx_referencia (referencia_tipo, referencia_id),
  KEY idx_lote (lote),
  
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Inventário (Contagens de Estoque)
CREATE TABLE IF NOT EXISTS inventario_estoque (
  id INT(11) NOT NULL AUTO_INCREMENT,
  numero_inventario VARCHAR(50) NOT NULL UNIQUE,
  descricao VARCHAR(200) NOT NULL,
  data_inicio DATETIME NOT NULL,
  data_conclusao DATETIME NULL,
  status ENUM('ABERTO', 'EM_CONTAGEM', 'CONCLUIDO', 'CANCELADO') DEFAULT 'ABERTO',
  tipo ENUM('TOTAL', 'PARCIAL', 'CICLICO') DEFAULT 'TOTAL',
  
  -- Totalizadores
  total_itens_contados INT(11) DEFAULT 0,
  total_divergencias INT(11) DEFAULT 0,
  valor_divergencia DECIMAL(15,2) DEFAULT 0.00,
  
  -- Auditoria
  usuario_criacao_id INT(11) NOT NULL,
  usuario_conclusao_id INT(11) NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_numero (numero_inventario),
  KEY idx_status (status),
  KEY idx_data_inicio (data_inicio),
  
  FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_conclusao_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Itens do Inventário
CREATE TABLE IF NOT EXISTS inventario_itens (
  id INT(11) NOT NULL AUTO_INCREMENT,
  inventario_id INT(11) NOT NULL,
  produto_id INT(11) NOT NULL,
  
  -- Contagem
  estoque_sistema DECIMAL(15,4) NOT NULL,
  estoque_contado DECIMAL(15,4) NULL,
  divergencia DECIMAL(15,4) DEFAULT 0.00,
  
  -- Custos
  custo_unitario DECIMAL(15,4) NOT NULL,
  valor_divergencia DECIMAL(15,2) DEFAULT 0.00,
  
  -- Status da contagem
  status ENUM('PENDENTE', 'CONTADO', 'AJUSTADO') DEFAULT 'PENDENTE',
  
  -- Informações adicionais
  localizacao VARCHAR(100) NULL,
  lote VARCHAR(50) NULL,
  observacoes TEXT NULL,
  
  -- Auditoria
  usuario_contagem_id INT(11) NULL,
  data_contagem DATETIME NULL,
  usuario_ajuste_id INT(11) NULL,
  data_ajuste DATETIME NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_inventario (inventario_id),
  KEY idx_produto (produto_id),
  KEY idx_status (status),
  
  FOREIGN KEY (inventario_id) REFERENCES inventario_estoque(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_contagem_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_ajuste_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Alertas de Estoque
CREATE TABLE IF NOT EXISTS alertas_estoque (
  id INT(11) NOT NULL AUTO_INCREMENT,
  produto_id INT(11) NOT NULL,
  tipo_alerta ENUM('ESTOQUE_MINIMO', 'ESTOQUE_MAXIMO', 'VALIDADE_PROXIMA', 'SEM_ESTOQUE', 'RUPTURA') NOT NULL,
  nivel_alerta ENUM('BAIXO', 'MEDIO', 'ALTO', 'CRITICO') DEFAULT 'MEDIO',
  
  -- Detalhes do alerta
  mensagem TEXT NOT NULL,
  estoque_atual DECIMAL(15,4) NOT NULL,
  estoque_referencia DECIMAL(15,4) NULL,
  data_validade DATE NULL,
  
  -- Status
  status ENUM('ATIVO', 'RESOLVIDO', 'IGNORADO') DEFAULT 'ATIVO',
  data_resolucao DATETIME NULL,
  usuario_resolucao_id INT(11) NULL,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_produto (produto_id),
  KEY idx_tipo (tipo_alerta),
  KEY idx_status (status),
  KEY idx_nivel (nivel_alerta),
  
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_resolucao_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Lotes (para rastreabilidade)
CREATE TABLE IF NOT EXISTS lotes_estoque (
  id INT(11) NOT NULL AUTO_INCREMENT,
  produto_id INT(11) NOT NULL,
  numero_lote VARCHAR(50) NOT NULL,
  
  -- Quantidades
  quantidade_inicial DECIMAL(15,4) NOT NULL,
  quantidade_atual DECIMAL(15,4) NOT NULL,
  
  -- Datas
  data_fabricacao DATE NULL,
  data_validade DATE NULL,
  data_entrada DATETIME NOT NULL,
  
  -- Custos
  custo_unitario DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Fornecedor
  fornecedor_id INT(11) NULL,
  documento_entrada VARCHAR(100) NULL,
  
  -- Status
  status ENUM('ATIVO', 'ESGOTADO', 'VENCIDO', 'BLOQUEADO') DEFAULT 'ATIVO',
  
  -- Localização
  localizacao VARCHAR(100) NULL,
  
  -- Auditoria
  observacoes TEXT NULL,
  usuario_id INT(11) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_produto_lote (produto_id, numero_lote),
  KEY idx_numero_lote (numero_lote),
  KEY idx_data_validade (data_validade),
  KEY idx_status (status),
  KEY idx_fornecedor (fornecedor_id),
  
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Depósitos/Locais de Armazenamento
CREATE TABLE IF NOT EXISTS depositos (
  id INT(11) NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT NULL,
  
  -- Endereço
  endereco VARCHAR(200) NULL,
  cidade VARCHAR(100) NULL,
  estado VARCHAR(2) NULL,
  cep VARCHAR(10) NULL,
  
  -- Tipo e características
  tipo ENUM('PRINCIPAL', 'SECUNDARIO', 'TRANSITO', 'QUARENTENA', 'DEVOLUCAO') DEFAULT 'PRINCIPAL',
  capacidade_maxima DECIMAL(15,2) NULL,
  
  -- Responsável
  responsavel VARCHAR(100) NULL,
  telefone VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  
  -- Status
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Auditoria
  observacoes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_codigo (codigo),
  KEY idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Estoque por Depósito
CREATE TABLE IF NOT EXISTS estoque_depositos (
  id INT(11) NOT NULL AUTO_INCREMENT,
  produto_id INT(11) NOT NULL,
  deposito_id INT(11) NOT NULL,
  
  -- Quantidades
  quantidade DECIMAL(15,4) DEFAULT 0.00,
  quantidade_reservada DECIMAL(15,4) DEFAULT 0.00,
  quantidade_disponivel DECIMAL(15,4) GENERATED ALWAYS AS (quantidade - quantidade_reservada) STORED,
  
  -- Localização específica
  corredor VARCHAR(20) NULL,
  prateleira VARCHAR(20) NULL,
  posicao VARCHAR(20) NULL,
  
  -- Controle
  estoque_minimo DECIMAL(15,4) DEFAULT 0.00,
  estoque_maximo DECIMAL(15,4) DEFAULT 0.00,
  
  -- Auditoria
  ultima_movimentacao DATETIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_produto_deposito (produto_id, deposito_id),
  KEY idx_deposito (deposito_id),
  KEY idx_quantidade (quantidade),
  
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (deposito_id) REFERENCES depositos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TRIGGERS PARA AUTOMAÇÃO
-- =====================================================

-- Trigger para criar alerta de estoque mínimo
DELIMITER $$
CREATE TRIGGER trg_alerta_estoque_minimo
AFTER UPDATE ON produtos
FOR EACH ROW
BEGIN
  -- Verifica estoque mínimo
  IF NEW.estoque_atual <= NEW.estoque_minimo AND NEW.estoque_minimo > 0 THEN
    INSERT INTO alertas_estoque (produto_id, tipo_alerta, nivel_alerta, mensagem, estoque_atual, estoque_referencia, status)
    VALUES (
      NEW.id, 
      'ESTOQUE_MINIMO',
      CASE 
        WHEN NEW.estoque_atual = 0 THEN 'CRITICO'
        WHEN NEW.estoque_atual <= (NEW.estoque_minimo * 0.5) THEN 'ALTO'
        ELSE 'MEDIO'
      END,
      CONCAT('Produto com estoque baixo: ', NEW.estoque_atual, ' de ', NEW.estoque_minimo),
      NEW.estoque_atual,
      NEW.estoque_minimo,
      'ATIVO'
    )
    ON DUPLICATE KEY UPDATE 
      estoque_atual = VALUES(estoque_atual),
      nivel_alerta = VALUES(nivel_alerta),
      mensagem = VALUES(mensagem),
      status = 'ATIVO',
      updated_at = CURRENT_TIMESTAMP;
  END IF;
END$$
DELIMITER ;

-- =====================================================
-- VIEWS PARA RELATÓRIOS
-- =====================================================

-- View de estoque consolidado
CREATE OR REPLACE VIEW vw_estoque_consolidado AS
SELECT 
  p.id as produto_id,
  p.codigo_principal,
  p.gtin,
  p.descricao,
  p.unidade,
  p.estoque_atual,
  p.estoque_minimo,
  p.estoque_maximo,
  p.preco_custo,
  p.preco_venda,
  (p.estoque_atual * p.preco_custo) as valor_estoque,
  s.nome as categoria,
  CASE 
    WHEN p.estoque_atual = 0 THEN 'SEM_ESTOQUE'
    WHEN p.estoque_atual <= p.estoque_minimo THEN 'ESTOQUE_BAIXO'
    WHEN p.estoque_atual >= p.estoque_maximo THEN 'ESTOQUE_ALTO'
    ELSE 'NORMAL'
  END as situacao_estoque,
  COUNT(DISTINCT l.id) as total_lotes,
  MIN(l.data_validade) as proxima_validade
FROM produtos p
LEFT JOIN secoes s ON p.categoria_id = s.id
LEFT JOIN lotes_estoque l ON l.produto_id = p.id AND l.status = 'ATIVO'
WHERE p.ativo = 1
GROUP BY p.id;

-- View de movimentações detalhadas
CREATE OR REPLACE VIEW vw_movimentacoes_detalhadas AS
SELECT 
  m.id,
  m.tipo,
  m.quantidade,
  m.estoque_anterior,
  m.estoque_novo,
  m.custo_unitario,
  m.custo_total,
  m.motivo,
  m.documento_referencia,
  m.data_movimentacao,
  p.codigo_principal,
  p.descricao as produto_descricao,
  p.unidade,
  u.nome as usuario_nome,
  m.deposito_origem,
  m.deposito_destino,
  m.lote
FROM movimentacoes_estoque m
INNER JOIN produtos p ON m.produto_id = p.id
INNER JOIN usuarios u ON m.usuario_id = u.id;

-- View de alertas ativos
CREATE OR REPLACE VIEW vw_alertas_ativos AS
SELECT 
  a.id,
  a.tipo_alerta,
  a.nivel_alerta,
  a.mensagem,
  a.estoque_atual,
  a.created_at,
  p.codigo_principal,
  p.descricao as produto_descricao,
  s.nome as categoria
FROM alertas_estoque a
INNER JOIN produtos p ON a.produto_id = p.id
LEFT JOIN secoes s ON p.categoria_id = s.id
WHERE a.status = 'ATIVO'
ORDER BY 
  FIELD(a.nivel_alerta, 'CRITICO', 'ALTO', 'MEDIO', 'BAIXO'),
  a.created_at DESC;

-- =====================================================
-- INSERIR DEPÓSITO PADRÃO
-- =====================================================

INSERT INTO depositos (codigo, nome, descricao, tipo, ativo) 
VALUES ('DEP-001', 'Depósito Principal', 'Depósito principal da empresa', 'PRINCIPAL', TRUE)
ON DUPLICATE KEY UPDATE nome = nome;
