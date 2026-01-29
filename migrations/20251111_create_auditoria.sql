-- Migration: Sistema de Auditoria Completo
-- Data: 2025-11-11
-- Descrição: Rastreabilidade total de mudanças no sistema

-- Tabela principal de auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tabela VARCHAR(100) NOT NULL,
  registro_id INT UNSIGNED,
  operacao ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','ACESSO_NEGADO') NOT NULL,
  usuario_id INT UNSIGNED,
  usuario_nome VARCHAR(255),
  dados_anteriores JSON,
  dados_novos JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tabela (tabela),
  INDEX idx_usuario (usuario_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_operacao (operacao),
  INDEX idx_registro (tabela, registro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY idx_token (token_hash),
  INDEX idx_usuario (usuario_id),
  INDEX idx_expires (expires_at),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logs de segurança
CREATE TABLE IF NOT EXISTS security_logs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_type ENUM('LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT','PASSWORD_CHANGE','2FA_ENABLED','2FA_DISABLED','PERMISSION_DENIED','SUSPICIOUS_ACTIVITY') NOT NULL,
  usuario_id INT UNSIGNED,
  username VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'LOW',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_usuario (usuario_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers de auditoria para produtos
DELIMITER $$

DROP TRIGGER IF EXISTS audit_produtos_insert$$
CREATE TRIGGER audit_produtos_insert
AFTER INSERT ON produtos
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_novos)
  VALUES ('produtos', NEW.id, 'INSERT', @current_user_id, 
    JSON_OBJECT(
      'descricao', NEW.descricao,
      'preco_venda', NEW.preco_venda,
      'estoque_atual', NEW.estoque_atual,
      'codigo_barras', NEW.codigo_barras
    )
  );
END$$

DROP TRIGGER IF EXISTS audit_produtos_update$$
CREATE TRIGGER audit_produtos_update
AFTER UPDATE ON produtos
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_anteriores, dados_novos)
  VALUES ('produtos', NEW.id, 'UPDATE', @current_user_id,
    JSON_OBJECT(
      'descricao', OLD.descricao,
      'preco_venda', OLD.preco_venda,
      'estoque_atual', OLD.estoque_atual,
      'preco_custo', OLD.preco_custo
    ),
    JSON_OBJECT(
      'descricao', NEW.descricao,
      'preco_venda', NEW.preco_venda,
      'estoque_atual', NEW.estoque_atual,
      'preco_custo', NEW.preco_custo
    )
  );
END$$

DROP TRIGGER IF EXISTS audit_produtos_delete$$
CREATE TRIGGER audit_produtos_delete
AFTER DELETE ON produtos
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_anteriores)
  VALUES ('produtos', OLD.id, 'DELETE', @current_user_id,
    JSON_OBJECT(
      'descricao', OLD.descricao,
      'preco_venda', OLD.preco_venda,
      'estoque_atual', OLD.estoque_atual
    )
  );
END$$

-- Triggers de auditoria para vendas
DROP TRIGGER IF EXISTS audit_vendas_insert$$
CREATE TRIGGER audit_vendas_insert
AFTER INSERT ON vendas
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_novos)
  VALUES ('vendas', NEW.id, 'INSERT', @current_user_id,
    JSON_OBJECT(
      'cliente_id', NEW.cliente_id,
      'vendedor_id', NEW.vendedor_id,
      'valor_total', NEW.valor_total,
      'forma_pagamento', NEW.forma_pagamento,
      'status', NEW.status
    )
  );
END$$

DROP TRIGGER IF EXISTS audit_vendas_update$$
CREATE TRIGGER audit_vendas_update
AFTER UPDATE ON vendas
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (tabela, registro_id, operacao, usuario_id, dados_anteriores, dados_novos)
  VALUES ('vendas', NEW.id, 'UPDATE', @current_user_id,
    JSON_OBJECT(
      'status', OLD.status,
      'valor_total', OLD.valor_total,
      'observacoes', OLD.observacoes
    ),
    JSON_OBJECT(
      'status', NEW.status,
      'valor_total', NEW.valor_total,
      'observacoes', NEW.observacoes
    )
  );
END$$

DELIMITER ;

-- Views úteis para auditoria
CREATE OR REPLACE VIEW v_auditoria_resumo AS
SELECT 
  DATE(timestamp) as data,
  tabela,
  operacao,
  COUNT(*) as quantidade,
  COUNT(DISTINCT usuario_id) as usuarios_distintos
FROM auditoria
GROUP BY DATE(timestamp), tabela, operacao
ORDER BY data DESC, quantidade DESC;

CREATE OR REPLACE VIEW v_ultimas_alteracoes AS
SELECT 
  a.id,
  a.tabela,
  a.registro_id,
  a.operacao,
  u.nome as usuario,
  a.timestamp,
  a.dados_anteriores,
  a.dados_novos
FROM auditoria a
LEFT JOIN usuarios u ON a.usuario_id = u.id
ORDER BY a.timestamp DESC
LIMIT 100;

-- Procedure para limpar logs antigos (manter últimos 365 dias)
DELIMITER $$

DROP PROCEDURE IF EXISTS limpar_auditoria_antiga$$
CREATE PROCEDURE limpar_auditoria_antiga()
BEGIN
  -- Manter logs de operações críticas por mais tempo
  DELETE FROM auditoria 
  WHERE timestamp < DATE_SUB(NOW(), INTERVAL 365 DAY)
  AND operacao NOT IN ('DELETE');
  
  -- Logs de segurança mantém por 2 anos
  DELETE FROM security_logs 
  WHERE timestamp < DATE_SUB(NOW(), INTERVAL 730 DAY);
END$$

DELIMITER ;

-- Event scheduler para limpeza automática (rodar 1x por semana)
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS evt_limpar_auditoria
-- ON SCHEDULE EVERY 1 WEEK
-- DO CALL limpar_auditoria_antiga();
