-- Criar o banco de dados se não existir
CREATE DATABASE IF NOT EXISTS nexus_dev;
USE nexus_dev;

-- Recriar a tabela fornecedores
DROP TABLE IF EXISTS fornecedores;
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