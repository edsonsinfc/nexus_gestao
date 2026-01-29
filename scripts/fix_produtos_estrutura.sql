-- Adicionar colunas que faltam na tabela produtos
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS estoque_atual DECIMAL(10,2) DEFAULT 0.00;