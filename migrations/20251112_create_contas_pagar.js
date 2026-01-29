require('dotenv').config();
const mysql = require('mysql2/promise');

async function up() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_gestao'
  });

  try {
    console.log('🔧 Criando tabela contas_pagar...');

    // Tabela principal de contas a pagar
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        
        -- Identificação
        numero_documento VARCHAR(50),
        codigo_interno VARCHAR(20) UNIQUE,
        
        -- Relacionamentos
        fornecedor_id INT UNSIGNED NOT NULL,
        categoria_id INT UNSIGNED,
        entrada_mercadoria_id INT UNSIGNED,
        pedido_compra_id INT UNSIGNED,
        
        -- Valores
        valor_total DECIMAL(15,2) NOT NULL,
        valor_pago DECIMAL(15,2) DEFAULT 0.00,
        valor_restante DECIMAL(15,2) NOT NULL,
        valor_desconto DECIMAL(15,2) DEFAULT 0.00,
        valor_juros DECIMAL(15,2) DEFAULT 0.00,
        valor_multa DECIMAL(15,2) DEFAULT 0.00,
        valor_final DECIMAL(15,2) NOT NULL,
        
        -- Datas
        data_emissao DATE NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        data_competencia DATE,
        
        -- Parcelamento
        parcelas INT DEFAULT 1,
        parcela_atual INT DEFAULT 1,
        
        -- Status e forma de pagamento
        status ENUM('PENDENTE', 'PARCIAL', 'PAGO', 'VENCIDO', 'CANCELADO') DEFAULT 'PENDENTE',
        forma_pagamento ENUM('DINHEIRO', 'BOLETO', 'TRANSFERENCIA', 'PIX', 'CARTAO', 'CHEQUE', 'OUTROS'),
        
        -- Dados bancários
        conta_bancaria_id INT UNSIGNED,
        banco VARCHAR(100),
        agencia VARCHAR(20),
        conta VARCHAR(30),
        favorecido VARCHAR(150),
        
        -- Recorrência
        recorrente TINYINT(1) DEFAULT 0,
        frequencia_recorrencia ENUM('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'),
        dia_recorrencia INT(2),
        
        -- Informações adicionais
        descricao TEXT NOT NULL,
        observacoes TEXT,
        anexos JSON,
        tags JSON,
        
        -- Controle
        baixado_por INT UNSIGNED,
        data_baixa DATETIME,
        usuario_criacao_id INT UNSIGNED NOT NULL,
        usuario_atualizacao_id INT UNSIGNED,
        
        -- Auditoria
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        
        PRIMARY KEY (id),
        KEY idx_fornecedor (fornecedor_id),
        KEY idx_categoria (categoria_id),
        KEY idx_status (status),
        KEY idx_data_vencimento (data_vencimento),
        KEY idx_data_pagamento (data_pagamento),
        KEY idx_data_emissao (data_emissao),
        KEY idx_numero_documento (numero_documento),
        KEY idx_codigo_interno (codigo_interno),
        KEY idx_conta_bancaria (conta_bancaria_id),
        
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
        FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
        FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id),
        FOREIGN KEY (usuario_atualizacao_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (baixado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    console.log('✅ Tabela contas_pagar criada com sucesso');

    // Tabela de parcelas de contas a pagar
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar_parcelas (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        
        conta_pagar_id INT UNSIGNED NOT NULL,
        numero_parcela INT NOT NULL,
        
        -- Valores
        valor_parcela DECIMAL(15,2) NOT NULL,
        valor_pago DECIMAL(15,2) DEFAULT 0.00,
        valor_desconto DECIMAL(15,2) DEFAULT 0.00,
        valor_juros DECIMAL(15,2) DEFAULT 0.00,
        valor_multa DECIMAL(15,2) DEFAULT 0.00,
        valor_final DECIMAL(15,2) NOT NULL,
        
        -- Datas
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        
        -- Status
        status ENUM('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO') DEFAULT 'PENDENTE',
        forma_pagamento ENUM('DINHEIRO', 'BOLETO', 'TRANSFERENCIA', 'PIX', 'CARTAO', 'CHEQUE', 'OUTROS'),
        
        -- Dados do pagamento
        numero_documento VARCHAR(50),
        conta_bancaria_id INT UNSIGNED,
        comprovante VARCHAR(255),
        
        -- Informações adicionais
        observacoes TEXT,
        
        -- Controle
        baixado_por INT UNSIGNED,
        data_baixa DATETIME,
        
        -- Auditoria
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        PRIMARY KEY (id),
        KEY idx_conta_pagar (conta_pagar_id),
        KEY idx_status (status),
        KEY idx_data_vencimento (data_vencimento),
        KEY idx_data_pagamento (data_pagamento),
        KEY idx_numero_parcela (numero_parcela),
        
        FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE CASCADE,
        FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL,
        FOREIGN KEY (baixado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    console.log('✅ Tabela contas_pagar_parcelas criada com sucesso');

    // Tabela de histórico de pagamentos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar_historico (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        
        conta_pagar_id INT UNSIGNED NOT NULL,
        parcela_id INT UNSIGNED,
        
        tipo_operacao ENUM('CRIACAO', 'EDICAO', 'BAIXA', 'ESTORNO', 'CANCELAMENTO') NOT NULL,
        
        -- Valores antes e depois
        dados_anteriores JSON,
        dados_novos JSON,
        
        -- Descrição da operação
        descricao TEXT,
        
        -- Controle
        usuario_id INT UNSIGNED NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        PRIMARY KEY (id),
        KEY idx_conta_pagar (conta_pagar_id),
        KEY idx_parcela (parcela_id),
        KEY idx_tipo_operacao (tipo_operacao),
        KEY idx_usuario (usuario_id),
        KEY idx_created_at (created_at),
        
        FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE CASCADE,
        FOREIGN KEY (parcela_id) REFERENCES contas_pagar_parcelas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    console.log('✅ Tabela contas_pagar_historico criada com sucesso');

    // Criar view para contas vencidas
    await connection.query(`
      CREATE OR REPLACE VIEW vw_contas_pagar_vencidas AS
      SELECT 
        cp.*,
        f.razao_social as fornecedor_nome,
        f.nome_fantasia as fornecedor_fantasia,
        cf.nome as categoria_nome,
        DATEDIFF(CURDATE(), cp.data_vencimento) as dias_vencido,
        (cp.valor_restante + cp.valor_juros + cp.valor_multa - cp.valor_desconto) as valor_total_vencido
      FROM contas_pagar cp
      LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
      LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
      WHERE cp.status IN ('PENDENTE', 'PARCIAL', 'VENCIDO')
        AND cp.data_vencimento < CURDATE()
        AND cp.deleted_at IS NULL
      ORDER BY cp.data_vencimento ASC
    `);
    
    console.log('✅ View vw_contas_pagar_vencidas criada');

    // Criar view para dashboard
    await connection.query(`
      CREATE OR REPLACE VIEW vw_dashboard_contas_pagar AS
      SELECT 
        DATE_FORMAT(data_vencimento, '%Y-%m') as mes_referencia,
        COUNT(*) as total_contas,
        SUM(CASE WHEN status = 'PAGO' THEN 1 ELSE 0 END) as pagas,
        SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN status = 'VENCIDO' THEN 1 ELSE 0 END) as vencidas,
        SUM(valor_total) as valor_total,
        SUM(valor_pago) as valor_pago,
        SUM(valor_restante) as valor_restante,
        SUM(valor_juros) as total_juros,
        SUM(valor_multa) as total_multa
      FROM contas_pagar
      WHERE deleted_at IS NULL
      GROUP BY DATE_FORMAT(data_vencimento, '%Y-%m')
      ORDER BY mes_referencia DESC
    `);
    
    console.log('✅ View vw_dashboard_contas_pagar criada');

    // Trigger para atualizar status automaticamente
    await connection.query(`
      CREATE TRIGGER trg_contas_pagar_atualizar_status
      BEFORE UPDATE ON contas_pagar
      FOR EACH ROW
      BEGIN
        -- Atualizar valor restante
        SET NEW.valor_restante = NEW.valor_total - NEW.valor_pago;
        
        -- Atualizar status baseado no pagamento
        IF NEW.valor_pago = 0 THEN
          IF NEW.data_vencimento < CURDATE() AND NEW.status != 'CANCELADO' THEN
            SET NEW.status = 'VENCIDO';
          ELSEIF NEW.status NOT IN ('CANCELADO') THEN
            SET NEW.status = 'PENDENTE';
          END IF;
        ELSEIF NEW.valor_pago >= NEW.valor_total THEN
          IF NEW.status != 'CANCELADO' THEN
            SET NEW.status = 'PAGO';
          END IF;
        ELSE
          IF NEW.status NOT IN ('CANCELADO') THEN
            SET NEW.status = 'PARCIAL';
          END IF;
        END IF;
      END
    `);
    
    console.log('✅ Trigger trg_contas_pagar_atualizar_status criado');

    console.log('');
    console.log('🎉 Migration de contas a pagar concluída com sucesso!');
    console.log('');
    console.log('📊 Estruturas criadas:');
    console.log('   ✅ Tabela: contas_pagar (principais campos)');
    console.log('   ✅ Tabela: contas_pagar_parcelas (parcelamento)');
    console.log('   ✅ Tabela: contas_pagar_historico (auditoria)');
    console.log('   ✅ View: vw_contas_pagar_vencidas');
    console.log('   ✅ View: vw_dashboard_contas_pagar');
    console.log('   ✅ Trigger: trg_contas_pagar_atualizar_status');
    
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_gestao'
  });

  try {
    console.log('🔧 Revertendo migration de contas a pagar...');
    
    await connection.query('DROP TRIGGER IF EXISTS trg_contas_pagar_atualizar_status');
    await connection.query('DROP VIEW IF EXISTS vw_dashboard_contas_pagar');
    await connection.query('DROP VIEW IF EXISTS vw_contas_pagar_vencidas');
    await connection.query('DROP TABLE IF EXISTS contas_pagar_historico');
    await connection.query('DROP TABLE IF EXISTS contas_pagar_parcelas');
    await connection.query('DROP TABLE IF EXISTS contas_pagar');
    
    console.log('✅ Migration revertida com sucesso');
  } catch (error) {
    console.error('❌ Erro ao reverter migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execução
if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { up, down };
