require('dotenv').config();
const mysql = require('mysql2/promise');

async function verificarTabelas() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'nexus_gestao'
    });

    console.log('🔍 Verificando tabelas no banco...\n');

    // Verificar contas_pagar
    const [contas] = await connection.query("SHOW TABLES LIKE 'contas_pagar'");
    console.log('📊 Tabela contas_pagar:', contas.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE');

    // Verificar contas_pagar_parcelas
    const [parcelas] = await connection.query("SHOW TABLES LIKE 'contas_pagar_parcelas'");
    console.log('📊 Tabela contas_pagar_parcelas:', parcelas.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE');

    // Verificar contas_pagar_historico
    const [historico] = await connection.query("SHOW TABLES LIKE 'contas_pagar_historico'");
    console.log('📊 Tabela contas_pagar_historico:', historico.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE');

    // Verificar fornecedores
    const [fornecedores] = await connection.query("SHOW TABLES LIKE 'fornecedores'");
    console.log('📊 Tabela fornecedores:', fornecedores.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE');

    // Verificar categorias_financeiras
    const [categorias] = await connection.query("SHOW TABLES LIKE 'categorias_financeiras'");
    console.log('📊 Tabela categorias_financeiras:', categorias.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE');

    // Verificar contas_bancarias
    const [banco] = await connection.query("SHOW TABLES LIKE 'contas_bancarias'");
    console.log('📊 Tabela contas_bancarias:', banco.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE');

    console.log('\n---\n');

    // Se contas_pagar não existe, vamos criá-la
    if (contas.length === 0) {
      console.log('🚀 Criando tabela contas_pagar...\n');
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS contas_pagar (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          codigo_interno VARCHAR(20) UNIQUE NOT NULL,
          fornecedor_id INT UNSIGNED NOT NULL,
          categoria_id INT UNSIGNED,
          numero_documento VARCHAR(100),
          descricao TEXT NOT NULL,
          valor_total DECIMAL(15,2) NOT NULL,
          valor_pago DECIMAL(15,2) DEFAULT 0.00,
          valor_restante DECIMAL(15,2) NOT NULL,
          valor_juros DECIMAL(15,2) DEFAULT 0.00,
          valor_multa DECIMAL(15,2) DEFAULT 0.00,
          valor_desconto DECIMAL(15,2) DEFAULT 0.00,
          data_emissao DATE NOT NULL,
          data_vencimento DATE NOT NULL,
          data_pagamento DATE NULL,
          status ENUM('PENDENTE', 'PAGO', 'VENCIDO', 'PARCIAL', 'CANCELADO') DEFAULT 'PENDENTE',
          forma_pagamento ENUM('DINHEIRO', 'BOLETO', 'TRANSFERENCIA', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CHEQUE', 'OUTROS'),
          conta_bancaria_id INT UNSIGNED,
          parcelas INT DEFAULT 1,
          parcela_atual INT DEFAULT 1,
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          usuario_criacao_id INT UNSIGNED DEFAULT 1,
          usuario_atualizacao_id INT UNSIGNED DEFAULT 1,
          FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
          FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
          INDEX idx_fornecedor (fornecedor_id),
          INDEX idx_categoria (categoria_id),
          INDEX idx_status (status),
          INDEX idx_data_vencimento (data_vencimento),
          INDEX idx_data_pagamento (data_pagamento)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Tabela contas_pagar criada!');

      // Criar tabela de parcelas
      await connection.query(`
        CREATE TABLE IF NOT EXISTS contas_pagar_parcelas (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          conta_pagar_id INT UNSIGNED NOT NULL,
          numero_parcela INT NOT NULL,
          valor_parcela DECIMAL(15,2) NOT NULL,
          valor_pago DECIMAL(15,2) DEFAULT 0.00,
          data_vencimento DATE NOT NULL,
          data_pagamento DATE NULL,
          status ENUM('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO') DEFAULT 'PENDENTE',
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE CASCADE,
          INDEX idx_conta (conta_pagar_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Tabela contas_pagar_parcelas criada!');

      // Criar tabela de histórico
      await connection.query(`
        CREATE TABLE IF NOT EXISTS contas_pagar_historico (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          conta_pagar_id INT UNSIGNED NOT NULL,
          tipo_operacao ENUM('CRIACAO', 'ATUALIZACAO', 'BAIXA', 'ESTORNO', 'CANCELAMENTO') NOT NULL,
          descricao TEXT,
          usuario_id INT UNSIGNED DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE CASCADE,
          INDEX idx_conta (conta_pagar_id),
          INDEX idx_tipo (tipo_operacao)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Tabela contas_pagar_historico criada!');
      
      console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
    } else {
      console.log('ℹ️  Tabela contas_pagar já existe. Nada a fazer.');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarTabelas();
