-- Verificar se a coluna existe
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'produtos'
    AND column_name = 'preco_venda'
    AND table_schema = DATABASE()
);

SET @sqlstmt := IF(
    @exists = 0,
    'ALTER TABLE produtos ADD COLUMN preco_venda DECIMAL(10,2) DEFAULT 0.00',
    'SELECT "Coluna preco_venda já existe"'
);

PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Atualizar preço de venda onde for nulo
UPDATE produtos SET preco_venda = 0 WHERE preco_venda IS NULL;