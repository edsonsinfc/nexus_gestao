-- =====================================================
-- ERP NEXUS GESTÃO - MATERIAL DE CONSTRUÇÃO
-- Estrutura completa do banco de dados MySQL
-- =====================================================

-- Configurações iniciais
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- =====================================================
-- 1. TABELAS DE CADASTRO
-- =====================================================

-- Tabela de usuários do sistema
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `login` varchar(50) NOT NULL UNIQUE,
  `senha_hash` varchar(255) NOT NULL,
  `email` varchar(100),
  `telefone` varchar(20),
  `perfil_id` int(11) NOT NULL,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_perfil` (`perfil_id`),
  KEY `idx_login` (`login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Perfis de usuário
CREATE TABLE `perfis` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `descricao` text,
  `permissoes` json,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vendedores
CREATE TABLE `vendedores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL UNIQUE,
  `nome` varchar(100) NOT NULL,
  `cpf` varchar(14),
  `telefone` varchar(20),
  `email` varchar(100),
  `endereco` text,
  `comissao_padrao` decimal(5,2) DEFAULT 0.00,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_cpf` (`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fornecedores
CREATE TABLE `fornecedores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL UNIQUE,
  `razao_social` varchar(150) NOT NULL,
  `nome_fantasia` varchar(100),
  `cnpj` varchar(18),
  `inscricao_estadual` varchar(20),
  `telefone` varchar(20),
  `email` varchar(100),
  `endereco` text,
  `cidade` varchar(100),
  `estado` varchar(2),
  `cep` varchar(10),
  `contato` varchar(100),
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_cnpj` (`cnpj`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clientes
CREATE TABLE `clientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL UNIQUE,
  `tipo` enum('PF','PJ') DEFAULT 'PF',
  `nome_razao_social` varchar(150) NOT NULL,
  `nome_fantasia` varchar(100),
  `cpf_cnpj` varchar(18),
  `inscricao_estadual` varchar(20),
  `telefone` varchar(20),
  `email` varchar(100),
  `endereco` text,
  `cidade` varchar(100),
  `estado` varchar(2),
  `cep` varchar(10),
  `limite_credito` decimal(15,2) DEFAULT 0.00,
  `vendedor_id` int(11),
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_cpf_cnpj` (`cpf_cnpj`),
  KEY `idx_vendedor` (`vendedor_id`),
  FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Produtos
CREATE TABLE `produtos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL UNIQUE,
  `codigo_barras` varchar(50),
  `descricao` varchar(200) NOT NULL,
  `descricao_completa` text,
  `unidade` varchar(10) DEFAULT 'UN',
  `categoria_id` int(11),
  `fornecedor_id` int(11),
  `preco_custo` decimal(15,4) DEFAULT 0.0000,
  `preco_venda` decimal(15,4) DEFAULT 0.0000,
  `margem_lucro` decimal(5,2) DEFAULT 0.00,
  `estoque_minimo` decimal(15,4) DEFAULT 0.0000,
  `estoque_atual` decimal(15,4) DEFAULT 0.0000,
  `peso` decimal(10,4) DEFAULT 0.0000,
  `volume` decimal(10,4) DEFAULT 0.0000,
  `ncm` varchar(20),
  `cfop` varchar(10),
  `origem` tinyint(1) DEFAULT 0,
  `icms` decimal(5,2) DEFAULT 0.00,
  `ipi` decimal(5,2) DEFAULT 0.00,
  `pis` decimal(5,2) DEFAULT 0.00,
  `cofins` decimal(5,2) DEFAULT 0.00,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_codigo_barras` (`codigo_barras`),
  KEY `idx_categoria` (`categoria_id`),
  KEY `idx_fornecedor` (`fornecedor_id`),
  FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Categorias de produtos
CREATE TABLE `categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL UNIQUE,
  `nome` varchar(100) NOT NULL,
  `descricao` text,
  `categoria_pai_id` int(11),
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_pai` (`categoria_pai_id`),
  FOREIGN KEY (`categoria_pai_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. MÓDULO DE ESTOQUE
-- =====================================================

-- Entrada de mercadorias
CREATE TABLE `entrada_mercadorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(20) NOT NULL UNIQUE,
  `fornecedor_id` int(11) NOT NULL,
  `data_entrada` date NOT NULL,
  `valor_total` decimal(15,2) DEFAULT 0.00,
  `status` enum('PENDENTE','RECEBIDO','CANCELADO') DEFAULT 'PENDENTE',
  `observacoes` text,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_numero` (`numero`),
  KEY `idx_fornecedor` (`fornecedor_id`),
  KEY `idx_data` (`data_entrada`),
  KEY `idx_usuario` (`usuario_id`),
  FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Itens da entrada de mercadorias
CREATE TABLE `entrada_mercadorias_itens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entrada_id` int(11) NOT NULL,
  `produto_id` int(11) NOT NULL,
  `quantidade` decimal(15,4) NOT NULL,
  `preco_custo` decimal(15,4) NOT NULL,
  `valor_total` decimal(15,2) NOT NULL,
  `lote` varchar(50),
  `validade` date,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entrada` (`entrada_id`),
  KEY `idx_produto` (`produto_id`),
  FOREIGN KEY (`entrada_id`) REFERENCES `entrada_mercadorias`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Movimentações de estoque
CREATE TABLE `movimentacoes_estoque` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `produto_id` int(11) NOT NULL,
  `tipo` enum('ENTRADA','SAIDA','AJUSTE') NOT NULL,
  `quantidade` decimal(15,4) NOT NULL,
  `saldo_anterior` decimal(15,4) NOT NULL,
  `saldo_atual` decimal(15,4) NOT NULL,
  `documento` varchar(50),
  `referencia_id` int(11),
  `observacoes` text,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_produto` (`produto_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_documento` (`documento`),
  KEY `idx_usuario` (`usuario_id`),
  FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. MÓDULO DE PEDIDOS E VENDAS
-- =====================================================

-- Pedidos
CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(20) NOT NULL UNIQUE,
  `cliente_id` int(11) NOT NULL,
  `vendedor_id` int(11),
  `data_pedido` date NOT NULL,
  `data_entrega` date,
  `valor_total` decimal(15,2) DEFAULT 0.00,
  `desconto` decimal(15,2) DEFAULT 0.00,
  `valor_final` decimal(15,2) DEFAULT 0.00,
  `status` enum('ABERTO','FATURADO','CANCELADO','ENTREGUE') DEFAULT 'ABERTO',
  `observacoes` text,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_numero` (`numero`),
  KEY `idx_cliente` (`cliente_id`),
  KEY `idx_vendedor` (`vendedor_id`),
  KEY `idx_data` (`data_pedido`),
  KEY `idx_usuario` (`usuario_id`),
  FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`),
  FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Itens do pedido
CREATE TABLE `pedido_itens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedido_id` int(11) NOT NULL,
  `produto_id` int(11) NOT NULL,
  `quantidade` decimal(15,4) NOT NULL,
  `preco_unitario` decimal(15,4) NOT NULL,
  `desconto` decimal(15,2) DEFAULT 0.00,
  `valor_total` decimal(15,2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pedido` (`pedido_id`),
  KEY `idx_produto` (`produto_id`),
  FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vendas (PDV)
CREATE TABLE `vendas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(20) NOT NULL UNIQUE,
  `cliente_id` int(11),
  `vendedor_id` int(11),
  `caixa_id` int(11),
  `data_venda` datetime NOT NULL,
  `valor_total` decimal(15,2) DEFAULT 0.00,
  `desconto` decimal(15,2) DEFAULT 0.00,
  `valor_final` decimal(15,2) DEFAULT 0.00,
  `forma_pagamento` enum('DINHEIRO','CARTAO','PIX','BOLETO','CREDITO') NOT NULL,
  `status` enum('FINALIZADA','CANCELADA') DEFAULT 'FINALIZADA',
  `observacoes` text,
  `usuario_id` int(11) NOT NULL,
  `offline` tinyint(1) DEFAULT 0,
  `sincronizado` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_numero` (`numero`),
  KEY `idx_cliente` (`cliente_id`),
  KEY `idx_vendedor` (`vendedor_id`),
  KEY `idx_caixa` (`caixa_id`),
  KEY `idx_data` (`data_venda`),
  KEY `idx_usuario` (`usuario_id`),
  FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Itens da venda
CREATE TABLE `venda_itens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venda_id` int(11) NOT NULL,
  `produto_id` int(11) NOT NULL,
  `quantidade` decimal(15,4) NOT NULL,
  `preco_unitario` decimal(15,4) NOT NULL,
  `desconto` decimal(15,2) DEFAULT 0.00,
  `valor_total` decimal(15,2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_venda` (`venda_id`),
  KEY `idx_produto` (`produto_id`),
  FOREIGN KEY (`venda_id`) REFERENCES `vendas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. MÓDULO DE CAIXA (PDV)
-- =====================================================

-- Caixas
CREATE TABLE `caixas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(20) NOT NULL UNIQUE,
  `descricao` varchar(100) NOT NULL,
  `valor_inicial` decimal(15,2) DEFAULT 0.00,
  `valor_atual` decimal(15,2) DEFAULT 0.00,
  `status` enum('ABERTO','FECHADO') DEFAULT 'FECHADO',
  `usuario_responsavel` int(11),
  `data_abertura` datetime,
  `data_fechamento` datetime,
  `observacoes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_numero` (`numero`),
  KEY `idx_status` (`status`),
  KEY `idx_usuario` (`usuario_responsavel`),
  FOREIGN KEY (`usuario_responsavel`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Movimentações de caixa
CREATE TABLE `movimentacoes_caixa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `caixa_id` int(11) NOT NULL,
  `tipo` enum('ENTRADA','SAIDA','ABERTURA','FECHAMENTO') NOT NULL,
  `valor` decimal(15,2) NOT NULL,
  `descricao` varchar(200) NOT NULL,
  `referencia_id` int(11),
  `observacoes` text,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_caixa` (`caixa_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_usuario` (`usuario_id`),
  FOREIGN KEY (`caixa_id`) REFERENCES `caixas`(`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. MÓDULO DE COMISSÕES
-- =====================================================

-- Regras de comissão
CREATE TABLE `comissao_regras` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo` enum('PRODUTO','FORNECEDOR','CATEGORIA','GLOBAL') NOT NULL,
  `referencia_id` int(11),
  `vendedor_id` int(11),
  `tipo_comissao` enum('PERCENTUAL','VALOR_FIXO') DEFAULT 'PERCENTUAL',
  `valor` decimal(15,4) NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_referencia` (`referencia_id`),
  KEY `idx_vendedor` (`vendedor_id`),
  KEY `idx_periodo` (`data_inicio`, `data_fim`),
  FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comissões calculadas
CREATE TABLE `comissoes_venda` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venda_id` int(11) NOT NULL,
  `vendedor_id` int(11) NOT NULL,
  `produto_id` int(11) NOT NULL,
  `quantidade` decimal(15,4) NOT NULL,
  `valor_venda` decimal(15,2) NOT NULL,
  `regra_id` int(11) NOT NULL,
  `tipo_comissao` enum('PERCENTUAL','VALOR_FIXO') NOT NULL,
  `percentual` decimal(5,4) DEFAULT 0.0000,
  `valor_fixo` decimal(15,4) DEFAULT 0.0000,
  `valor_comissao` decimal(15,2) NOT NULL,
  `pago` tinyint(1) DEFAULT 0,
  `data_pagamento` date,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_venda` (`venda_id`),
  KEY `idx_vendedor` (`vendedor_id`),
  KEY `idx_produto` (`produto_id`),
  KEY `idx_regra` (`regra_id`),
  FOREIGN KEY (`venda_id`) REFERENCES `vendas`(`id`),
  FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`),
  FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`),
  FOREIGN KEY (`regra_id`) REFERENCES `comissao_regras`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 6. SISTEMA DE SINCRONIZAÇÃO (OFFLINE)
-- =====================================================

-- Log de sincronização
CREATE TABLE `sincronizacao` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tabela` varchar(50) NOT NULL,
  `registro_id` int(11) NOT NULL,
  `operacao` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `dados` json,
  `sincronizado` tinyint(1) DEFAULT 0,
  `data_sincronizacao` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tabela` (`tabela`),
  KEY `idx_registro` (`registro_id`),
  KEY `idx_sincronizado` (`sincronizado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 7. CONFIGURAÇÕES DO SISTEMA
-- =====================================================

-- Configurações gerais
CREATE TABLE `configuracoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chave` varchar(100) NOT NULL UNIQUE,
  `valor` text,
  `descricao` text,
  `tipo` enum('STRING','NUMBER','BOOLEAN','JSON') DEFAULT 'STRING',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 8. DADOS INICIAIS
-- =====================================================

-- Perfis padrão
INSERT INTO `perfis` (`id`, `nome`, `descricao`, `permissoes`) VALUES
(1, 'Administrador', 'Acesso total ao sistema', '{"all": true}'),
(2, 'Gerente', 'Acesso a relatórios e configurações', '{"relatorios": true, "configuracoes": true, "cadastros": true}'),
(3, 'Vendedor', 'Acesso ao PDV e vendas', '{"pdv": true, "vendas": true, "clientes": true}'),
(4, 'Estoquista', 'Acesso ao estoque e entrada de mercadorias', '{"estoque": true, "entrada": true, "produtos": true}');

-- Usuário admin padrão
INSERT INTO `usuarios` (`id`, `nome`, `login`, `senha_hash`, `email`, `perfil_id`) VALUES
(1, 'Administrador do Sistema', 'admin', '$2b$10$ev6f2vQFNwyT.WBhHgzlR./ABamYWSuLao5H.fZRxIAm9ZB5iqz36', 'admin@nexus.com.br', 1);

-- Configurações iniciais
INSERT INTO `configuracoes` (`chave`, `valor`, `descricao`, `tipo`) VALUES
('empresa_nome', 'Nexus Gestão - Material de Construção', 'Nome da empresa', 'STRING'),
('empresa_cnpj', '', 'CNPJ da empresa', 'STRING'),
('empresa_endereco', '', 'Endereço da empresa', 'STRING'),
('pdv_offline', 'true', 'Permitir PDV offline', 'BOOLEAN'),
('comissao_padrao', '2.5', 'Comissão padrão para vendedores (%)', 'NUMBER'),
('estoque_negativo', 'false', 'Permitir estoque negativo', 'BOOLEAN');

COMMIT;

