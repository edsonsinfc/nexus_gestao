-- Atualizar tabela produtos para ter o campo preco_venda
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2) DEFAULT 0.00 AFTER preco_custo;