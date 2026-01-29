-- Migration: Criar tabela produtos completa
-- Data: 05/11/2025
-- Descrição: Criação da tabela produtos com todos os campos necessários

-- Drop table if exists (cuidado em produção!)
DROP TABLE IF EXISTS produtos;

-- Criar tabela produtos com estrutura completa
CREATE TABLE produtos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codprod VARCHAR(20) NOT NULL UNIQUE,
  descricao VARCHAR(255) NOT NULL,
  unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
  multiplos INT NOT NULL DEFAULT 1,
  estoque DECIMAL(10,3) NOT NULL DEFAULT 0,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  ncm VARCHAR(10),
  categoria VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  foto VARCHAR(500),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX idx_produtos_codprod ON produtos(codprod);
CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_ativo ON produtos(ativo);

-- Inserir alguns produtos de exemplo
INSERT INTO produtos (codprod, descricao, unidade, multiplos, estoque, preco, ncm, categoria, foto) VALUES
('LMP001', 'Detergente Neutro 5L', 'UN', 6, 120.000, 15.90, '3402.20.00', 'limpeza', 'https://via.placeholder.com/300x300?text=Detergente'),
('LMP002', 'Desinfetante Pinho Sol 2L', 'UN', 12, 200.000, 8.50, '3402.20.00', 'limpeza', 'https://via.placeholder.com/300x300?text=Desinfetante'),
('LMP003', 'Sabão em Pó 2kg', 'UN', 10, 80.000, 12.30, '3402.20.00', 'limpeza', 'https://via.placeholder.com/300x300?text=Sabao'),
('HIG001', 'Papel Higiênico 64 rolos', 'FD', 5, 50.000, 45.00, '4818.10.00', 'higiene', 'https://via.placeholder.com/300x300?text=Papel+Higienico'),
('HIG002', 'Papel Toalha Interfolhas 1000fls', 'PCT', 20, 100.000, 18.90, '4818.40.00', 'higiene', 'https://via.placeholder.com/300x300?text=Papel+Toalha'),
('DESC001', 'Copo Descartável 200ml cx/100', 'CX', 25, 300.000, 8.75, '3924.10.00', 'descartaveis', 'https://via.placeholder.com/300x300?text=Copo'),
('DESC002', 'Prato Descartável 15cm cx/100', 'CX', 20, 150.000, 12.40, '3924.10.00', 'descartaveis', 'https://via.placeholder.com/300x300?text=Prato'),
('EQP001', 'Vassoura de Piaçaba', 'UN', 1, 25.000, 22.50, '9603.10.00', 'equipamentos', 'https://via.placeholder.com/300x300?text=Vassoura'),
('EQP002', 'Rodo 40cm', 'UN', 1, 30.000, 18.90, '9603.90.00', 'equipamentos', 'https://via.placeholder.com/300x300?text=Rodo'),
('LMP004', 'Álcool Gel 70% 1L', 'UN', 12, 90.000, 9.80, '2207.20.90', 'limpeza', 'https://via.placeholder.com/300x300?text=Alcool+Gel'),
('HIG003', 'Sabonete Líquido 5L', 'UN', 4, 60.000, 28.50, '3401.11.90', 'higiene', 'https://via.placeholder.com/300x300?text=Sabonete'),
('DESC003', 'Guardanapo 22x20 pct/50', 'PCT', 50, 200.000, 3.20, '4818.50.00', 'descartaveis', 'https://via.placeholder.com/300x300?text=Guardanapo');

-- Mostrar produtos inseridos
SELECT 'Produtos inseridos com sucesso!' as status;
SELECT COUNT(*) as total_produtos FROM produtos;