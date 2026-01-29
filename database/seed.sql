-- =====================================================
-- DADOS DE EXEMPLO PARA O ERP NEXUS GESTÃO
-- =====================================================

-- Inserir categorias de produtos
INSERT INTO `categorias` (`codigo`, `nome`, `descricao`) VALUES
('CIM', 'Cimento', 'Cimentos e argamassas'),
('FER', 'Ferragens', 'Ferragens para construção'),
('TEL', 'Telhas', 'Telhas e coberturas'),
('TUB', 'Tubos', 'Tubos e conexões'),
('TIN', 'Tintas', 'Tintas e vernizes'),
('PIS', 'Pisos', 'Pisos e revestimentos');

-- Inserir fornecedores
INSERT INTO `fornecedores` (`codigo`, `razao_social`, `nome_fantasia`, `cnpj`, `telefone`, `email`, `endereco`, `cidade`, `estado`, `cep`) VALUES
('FOR001', 'Cimento Nacional Ltda', 'Cimento Nacional', '12.345.678/0001-90', '(11) 3333-4444', 'vendas@cimentonacional.com.br', 'Rua das Indústrias, 100', 'São Paulo', 'SP', '01234-567'),
('FOR002', 'Ferragens do Brasil S.A.', 'Ferragens Brasil', '98.765.432/0001-10', '(11) 2222-3333', 'contato@ferragensbrasil.com.br', 'Av. Industrial, 500', 'São Paulo', 'SP', '04567-890'),
('FOR003', 'Telhas Modernas Ltda', 'Telhas Modernas', '11.222.333/0001-44', '(11) 4444-5555', 'vendas@telhasmodernas.com.br', 'Rua das Telhas, 200', 'Guarulhos', 'SP', '07000-123');

-- Inserir vendedores
INSERT INTO `vendedores` (`codigo`, `nome`, `cpf`, `telefone`, `email`, `comissao_padrao`) VALUES
('VEN001', 'João Silva Santos', '123.456.789-00', '(11) 99999-1111', 'joao@nexus.com.br', 3.50),
('VEN002', 'Maria Oliveira Costa', '987.654.321-00', '(11) 99999-2222', 'maria@nexus.com.br', 3.00),
('VEN003', 'Pedro Santos Lima', '456.789.123-00', '(11) 99999-3333', 'pedro@nexus.com.br', 2.50);

-- Inserir clientes
INSERT INTO `clientes` (`codigo`, `tipo`, `nome_razao_social`, `nome_fantasia`, `cpf_cnpj`, `telefone`, `email`, `endereco`, `cidade`, `estado`, `cep`, `limite_credito`, `vendedor_id`) VALUES
('CLI001', 'PJ', 'Construtora ABC Ltda', 'Construtora ABC', '12.345.678/0001-01', '(11) 3333-1111', 'compras@construtoraabc.com.br', 'Rua das Obras, 100', 'São Paulo', 'SP', '01234-001', 50000.00, 1),
('CLI002', 'PF', 'Carlos Mendes', '', '123.456.789-01', '(11) 99999-4444', 'carlos@email.com', 'Rua das Flores, 200', 'São Paulo', 'SP', '01234-002', 5000.00, 2),
('CLI003', 'PJ', 'Engenharia XYZ S.A.', 'Engenharia XYZ', '98.765.432/0001-02', '(11) 3333-2222', 'compras@engenhariexyz.com.br', 'Av. das Construções, 300', 'São Paulo', 'SP', '01234-003', 100000.00, 1);

-- Inserir produtos
INSERT INTO `produtos` (`codigo`, `codigo_barras`, `descricao`, `descricao_completa`, `unidade`, `categoria_id`, `fornecedor_id`, `preco_custo`, `preco_venda`, `margem_lucro`, `estoque_minimo`, `estoque_atual`, `peso`, `volume`, `ncm`, `cfop`, `origem`, `icms`, `ipi`, `pis`, `cofins`) VALUES
('CIM001', '7891234567890', 'Cimento CP II-Z-32', 'Cimento Portland Composto com Escória - 32 MPa', 'SAC', 1, 1, 25.00, 35.00, 40.00, 100.00, 500.00, 50.00, 0.035, '2523.29.00', '5102', 0, 18.00, 0.00, 1.65, 7.60),
('FER001', '7891234567891', 'Prego 18x24', 'Prego comum 18x24mm - caixa com 1kg', 'CX', 2, 2, 15.00, 22.00, 46.67, 50.00, 200.00, 1.00, 0.001, '7317.00.00', '5102', 0, 18.00, 0.00, 1.65, 7.60),
('TEL001', '7891234567892', 'Telha Cerâmica', 'Telha cerâmica colonial - unidade', 'UN', 3, 3, 8.50, 12.50, 47.06, 200.00, 1000.00, 2.50, 0.008, '6904.10.00', '5102', 0, 18.00, 0.00, 1.65, 7.60),
('TUB001', '7891234567893', 'Tubo PVC 100mm', 'Tubo PVC esgoto 100mm x 3m', 'UN', 4, 2, 45.00, 65.00, 44.44, 20.00, 150.00, 8.00, 0.024, '3917.23.00', '5102', 0, 18.00, 0.00, 1.65, 7.60),
('TIN001', '7891234567894', 'Tinta Acrílica Branca', 'Tinta acrílica premium branca 18L', 'LT', 5, 2, 120.00, 180.00, 50.00, 10.00, 50.00, 20.00, 0.018, '3209.10.00', '5102', 0, 18.00, 0.00, 1.65, 7.60);

-- Inserir caixa padrão
INSERT INTO `caixas` (`numero`, `descricao`, `valor_inicial`, `valor_atual`, `status`) VALUES
('CX001', 'Caixa Principal', 100.00, 100.00, 'FECHADO');

-- Inserir regras de comissão
INSERT INTO `comissao_regras` (`tipo`, `referencia_id`, `vendedor_id`, `tipo_comissao`, `valor`, `data_inicio`) VALUES
('GLOBAL', NULL, 1, 'PERCENTUAL', 3.50, '2024-01-01'),
('GLOBAL', NULL, 2, 'PERCENTUAL', 3.00, '2024-01-01'),
('GLOBAL', NULL, 3, 'PERCENTUAL', 2.50, '2024-01-01'),
('CATEGORIA', 1, NULL, 'PERCENTUAL', 4.00, '2024-01-01'), -- Cimento
('CATEGORIA', 2, NULL, 'PERCENTUAL', 3.50, '2024-01-01'), -- Ferragens
('PRODUTO', 1, NULL, 'PERCENTUAL', 5.00, '2024-01-01'); -- Cimento específico

