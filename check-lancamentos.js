const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const [tables] = await conn.query('SHOW TABLES LIKE "lancamentos_financeiros"');
    
    if (tables.length > 0) {
      console.log('✅ Tabela lancamentos_financeiros já existe');
    } else {
      console.log('❌ Tabela não existe. Criando...');
      
      // Criar tabela
      await conn.query(`
        CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          tipo ENUM('RECEITA', 'DESPESA', 'TRANSFERENCIA') NOT NULL,
          categoria_id INT UNSIGNED,
          conta_bancaria_id INT UNSIGNED,
          descricao VARCHAR(255) NOT NULL,
          valor DECIMAL(15,2) NOT NULL,
          data_lancamento DATE NOT NULL,
          data_vencimento DATE,
          data_pagamento DATE,
          status ENUM('PENDENTE', 'PAGO', 'CANCELADO') DEFAULT 'PENDENTE',
          forma_pagamento VARCHAR(50),
          numero_documento VARCHAR(50) COMMENT 'Número do cheque, boleto, etc',
          pessoa_id INT UNSIGNED COMMENT 'Cliente/Fornecedor',
          pessoa_tipo ENUM('CLIENTE', 'FORNECEDOR', 'OUTRO'),
          venda_id INT UNSIGNED COMMENT 'Referência a venda (se for receita de venda)',
          nfce_id INT UNSIGNED COMMENT 'Referência a NFC-e',
          nfe_id INT UNSIGNED COMMENT 'Referência a NF-e',
          pedido_compra_id INT UNSIGNED COMMENT 'Referência a pedido de compra',
          conciliado BOOLEAN DEFAULT FALSE,
          conciliacao_id INT UNSIGNED,
          observacoes TEXT,
          usuario_id INT UNSIGNED,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
          INDEX idx_tipo (tipo),
          INDEX idx_status (status),
          INDEX idx_data_lancamento (data_lancamento),
          INDEX idx_data_vencimento (data_vencimento),
          INDEX idx_conciliado (conciliado),
          INDEX idx_categoria (categoria_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela criada com sucesso!');
    }

    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
})();
