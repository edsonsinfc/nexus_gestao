-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id INT PRIMARY KEY AUTO_INCREMENT,
  produto_id INT NOT NULL,
  tipo ENUM('ENTRADA', 'SAIDA', 'AJUSTE_ENTRADA', 'AJUSTE_SAIDA', 'DEVOLUCAO', 'PERDA', 'TRANSFERENCIA') NOT NULL,
  quantidade DECIMAL(10,3) NOT NULL,
  estoque_anterior DECIMAL(10,3) NOT NULL,
  estoque_novo DECIMAL(10,3) NOT NULL,
  motivo VARCHAR(100),
  observacao TEXT,
  documento_referencia VARCHAR(50),
  usuario_id INT,
  data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_produto (produto_id),
  INDEX idx_data (data_movimentacao),
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
