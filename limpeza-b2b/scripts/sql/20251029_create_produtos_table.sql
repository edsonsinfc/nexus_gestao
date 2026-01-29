-- Tabela de produtos para catálogo B2B
CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  unidade_venda VARCHAR(10) DEFAULT 'UN',
  foto_url VARCHAR(500),
  preco DECIMAL(15,2) NOT NULL DEFAULT 0,
  categoria VARCHAR(100),
  fornecedor VARCHAR(100),
  ativo TINYINT(1) DEFAULT 1,
  estoque_disponivel DECIMAL(15,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_codigo (codigo),
  INDEX idx_categoria (categoria),
  INDEX idx_ativo (ativo),
  INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Adicionar campo vendedor_email na tabela equipes para notificações
ALTER TABLE equipes 
ADD COLUMN vendedor_email VARCHAR(120) DEFAULT NULL 
AFTER gestor_id;

-- Criar tabela para configurações de email
CREATE TABLE IF NOT EXISTS email_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(100) NOT NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_user VARCHAR(120) NOT NULL,
  smtp_pass VARCHAR(255) NOT NULL,
  from_email VARCHAR(120) NOT NULL,
  from_name VARCHAR(100) DEFAULT 'Nexus B2B',
  ativo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;