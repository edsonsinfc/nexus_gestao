-- Tabela de Condições de Pagamento
CREATE TABLE IF NOT EXISTS condicoes_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(100) NOT NULL,
    dias_entre_parcelas INT NOT NULL DEFAULT 30,
    numero_parcelas INT NOT NULL DEFAULT 1,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Formas de Pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(100) NOT NULL,
    tipo ENUM('PIX', 'BOLETO', 'CARTAO', 'DINHEIRO', 'OUTROS') NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela Principal de Vendas
CREATE TABLE IF NOT EXISTS vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    data_venda DATE NOT NULL,
    cliente_id INT NOT NULL,
    vendedor_id INT NOT NULL,
    tipo_venda ENUM('FISCAL', 'NAO_FISCAL') NOT NULL,
    condicao_pagamento_id INT NOT NULL,
    forma_pagamento_id INT NOT NULL,
    status ENUM('ABERTO', 'PARCIALMENTE_ENTREGUE', 'ENTREGUE', 'FATURADO', 'CANCELADO', 'PENDENTE_FINANCEIRO') NOT NULL DEFAULT 'ABERTO',
    observacoes TEXT,
    valor_frete DECIMAL(10,2) DEFAULT 0.00,
    valor_despesas DECIMAL(10,2) DEFAULT 0.00,
    desconto_percentual DECIMAL(5,2) DEFAULT 0.00,
    valor_total_produtos DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    modo_entrega ENUM('TOTAL', 'PARCIAL') NOT NULL DEFAULT 'TOTAL',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
    FOREIGN KEY (condicao_pagamento_id) REFERENCES condicoes_pagamento(id),
    FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id)
);

-- Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS vendas_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    desconto_percentual DECIMAL(5,2) DEFAULT 0.00,
    valor_subtotal DECIMAL(10,2) NOT NULL,
    quantidade_entregue DECIMAL(10,3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venda_id) REFERENCES vendas(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Tabela de Entregas
CREATE TABLE IF NOT EXISTS vendas_entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT NOT NULL,
    data_entrega DATE NOT NULL,
    responsavel VARCHAR(100),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venda_id) REFERENCES vendas(id)
);

-- Tabela de Itens da Entrega
CREATE TABLE IF NOT EXISTS vendas_entregas_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entrega_id INT NOT NULL,
    venda_item_id INT NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entrega_id) REFERENCES vendas_entregas(id),
    FOREIGN KEY (venda_item_id) REFERENCES vendas_itens(id)
);

-- Inserir algumas condições de pagamento padrão
INSERT INTO condicoes_pagamento (descricao, dias_entre_parcelas, numero_parcelas) VALUES
('À Vista', 0, 1),
('30 Dias', 30, 1),
('2x em 30 Dias', 30, 2),
('3x em 30 Dias', 30, 3);

-- Inserir formas de pagamento padrão
INSERT INTO formas_pagamento (descricao, tipo) VALUES
('PIX', 'PIX'),
('Boleto Bancário', 'BOLETO'),
('Cartão de Crédito', 'CARTAO'),
('Dinheiro', 'DINHEIRO');