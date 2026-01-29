-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('PF', 'PJ') NOT NULL,
    cpf_cnpj VARCHAR(20),
    rg_ie VARCHAR(20),
    email VARCHAR(100),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    cep VARCHAR(10),
    endereco VARCHAR(100),
    numero VARCHAR(10),
    complemento VARCHAR(50),
    bairro VARCHAR(50),
    cidade VARCHAR(50),
    estado CHAR(2),
    observacao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    unidade VARCHAR(10),
    categoria_id INT,
    departamento_id INT,
    fornecedor_id INT,
    preco_custo DECIMAL(10,2),
    preco_venda DECIMAL(10,2) NOT NULL,
    margem_lucro DECIMAL(5,2),
    estoque_minimo DECIMAL(10,2),
    estoque_atual DECIMAL(10,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);

-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(100) NOT NULL,
    nome_fantasia VARCHAR(100),
    cnpj VARCHAR(20) NOT NULL,
    inscricao_estadual VARCHAR(20),
    email VARCHAR(100),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    cep VARCHAR(10),
    endereco VARCHAR(100),
    numero VARCHAR(10),
    complemento VARCHAR(50),
    bairro VARCHAR(50),
    cidade VARCHAR(50),
    estado CHAR(2),
    contato_nome VARCHAR(100),
    contato_telefone VARCHAR(20),
    contato_email VARCHAR(100),
    observacao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar tabela de departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserir algumas categorias de exemplo
INSERT INTO categorias (nome, descricao) VALUES 
('Alimentos', 'Produtos alimentícios em geral'),
('Bebidas', 'Bebidas em geral'),
('Limpeza', 'Produtos de limpeza'),
('Higiene', 'Produtos de higiene pessoal'),
('Papelaria', 'Materiais de escritório e papelaria');

-- Inserir alguns departamentos de exemplo
INSERT INTO departamentos (nome, descricao) VALUES 
('Mercearia', 'Produtos de mercearia em geral'),
('Bebidas', 'Setor de bebidas'),
('Limpeza', 'Produtos de limpeza doméstica'),
('Higiene', 'Produtos de higiene pessoal'),
('Escritório', 'Material de escritório');

-- Inserir um fornecedor de exemplo
INSERT INTO fornecedores (
    razao_social, 
    nome_fantasia, 
    cnpj, 
    inscricao_estadual, 
    email, 
    telefone
) VALUES (
    'Fornecedor Exemplo Ltda', 
    'Fornecedor Exemplo', 
    '12345678901234', 
    '123456789', 
    'contato@fornecedor.com', 
    '11999999999'
);

-- Inserir alguns produtos de exemplo
INSERT INTO produtos (
    codigo,
    descricao,
    unidade,
    categoria_id,
    departamento_id,
    fornecedor_id,
    preco_custo,
    preco_venda,
    margem_lucro,
    estoque_minimo,
    estoque_atual
) VALUES 
('001', 'Arroz 5kg', 'UN', 1, 1, 1, 15.00, 25.00, 66.67, 10, 50),
('002', 'Feijão 1kg', 'UN', 1, 1, 1, 5.00, 8.00, 60.00, 20, 100),
('003', 'Café 500g', 'UN', 1, 1, 1, 8.00, 12.00, 50.00, 15, 75),
('004', 'Refrigerante 2L', 'UN', 2, 2, 1, 4.00, 7.00, 75.00, 30, 150),
('005', 'Água Mineral 500ml', 'UN', 2, 2, 1, 1.00, 2.50, 150.00, 50, 200);

-- Inserir alguns clientes de exemplo
INSERT INTO clientes (
    nome,
    tipo,
    cpf_cnpj,
    email,
    telefone,
    celular
) VALUES 
('João Silva', 'PF', '12345678901', 'joao@email.com', '11999999999', '11988888888'),
('Maria Santos', 'PF', '98765432109', 'maria@email.com', '11977777777', '11966666666'),
('Empresa XYZ', 'PJ', '12345678901234', 'contato@xyz.com', '1133333333', '11944444444');