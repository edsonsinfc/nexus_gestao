-- Ajustes na tabela nfe_entrada para suportar entrada manual
-- Executar este script se houver erro de campo não encontrado

-- 1. Adicionar coluna tipo_entrada se não existir
ALTER TABLE nfe_entrada 
ADD COLUMN IF NOT EXISTS tipo_entrada ENUM('XML', 'SEFAZ', 'MANUAL') DEFAULT 'XML'
COMMENT 'Origem da entrada: XML=Upload manual, SEFAZ=Download automático, MANUAL=Digitação manual';

-- 2. Adicionar coluna criado_por_id se não existir
ALTER TABLE nfe_entrada 
ADD COLUMN IF NOT EXISTS criado_por_id INT UNSIGNED COMMENT 'Usuário que criou o registro',
ADD INDEX IF NOT EXISTS idx_criado_por (criado_por_id);

-- 3. Tornar chave_acesso opcional (para entradas manuais sem XML)
ALTER TABLE nfe_entrada 
MODIFY COLUMN chave_acesso VARCHAR(44) NULL;

-- 4. Adicionar campo numero_nf como alias de numero_nfe (compatibilidade)
-- ALTER TABLE nfe_entrada ADD COLUMN numero_nf VARCHAR(20) AS (numero_nfe) STORED;

-- 5. Adicionar campo serie_nf como alias de serie (compatibilidade)
-- ALTER TABLE nfe_entrada ADD COLUMN serie_nf VARCHAR(3) AS (serie) STORED;

-- 6. Renomear campos para padronizar (CUIDADO: pode quebrar código existente)
-- Descomentar apenas se necessário e após backup
-- ALTER TABLE nfe_entrada CHANGE COLUMN numero_nfe numero_nf VARCHAR(20) NOT NULL;
-- ALTER TABLE nfe_entrada CHANGE COLUMN serie serie_nf VARCHAR(3) NOT NULL;

-- 7. Adicionar campo valor_outros como alias de valor_outras_despesas
-- ALTER TABLE nfe_entrada ADD COLUMN valor_outros DECIMAL(15,2) AS (valor_outras_despesas) STORED;

SELECT 'Script de ajuste executado com sucesso!' as status;
