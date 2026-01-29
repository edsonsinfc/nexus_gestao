const pool = require('./db');

async function criarTabelaFormasPagamento() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Criando tabela formas_pagamento...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS formas_pagamento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        codigo VARCHAR(20),
        tipo ENUM('DINHEIRO', 'CHEQUE', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA', 'OUTROS') NOT NULL,
        permite_parcelamento BOOLEAN DEFAULT FALSE,
        dias_compensacao INT DEFAULT 0,
        taxa_percentual DECIMAL(5,2) DEFAULT 0,
        taxa_fixa DECIMAL(10,2) DEFAULT 0,
        conta_bancaria_id INT,
        visivel_vendas BOOLEAN DEFAULT TRUE,
        visivel_compras BOOLEAN DEFAULT TRUE,
        ativo BOOLEAN DEFAULT TRUE,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tabela formas_pagamento criada!');

    // Commit explícito
    await connection.commit();

    // Tabela de relacionamento entre formas de pagamento e planos
    console.log('🔧 Criando tabela formas_pagamento_planos...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS formas_pagamento_planos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        forma_pagamento_id INT NOT NULL,
        plano_pagamento_id INT NOT NULL,
        taxa_adicional_percentual DECIMAL(5,2) DEFAULT 0,
        taxa_adicional_fixa DECIMAL(10,2) DEFAULT 0,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_forma_plano (forma_pagamento_id, plano_pagamento_id),
        KEY idx_forma_pagamento (forma_pagamento_id),
        KEY idx_plano_pagamento (plano_pagamento_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tabela formas_pagamento_planos criada!');

    // Inserir formas de pagamento padrão
    console.log('📝 Inserindo formas de pagamento padrão...');

    const formasDefault = [
      { 
        nome: 'Dinheiro', 
        codigo: 'DIN', 
        tipo: 'DINHEIRO', 
        permite_parcelamento: false, 
        dias_compensacao: 0,
        taxa_percentual: 0,
        visivel_vendas: true, 
        visivel_compras: true 
      },
      { 
        nome: 'PIX', 
        codigo: 'PIX', 
        tipo: 'PIX', 
        permite_parcelamento: false, 
        dias_compensacao: 0,
        taxa_percentual: 0,
        visivel_vendas: true, 
        visivel_compras: true 
      },
      { 
        nome: 'Cartão de Débito', 
        codigo: 'CDEB', 
        tipo: 'CARTAO_DEBITO', 
        permite_parcelamento: false, 
        dias_compensacao: 1,
        taxa_percentual: 2.5,
        visivel_vendas: true, 
        visivel_compras: false 
      },
      { 
        nome: 'Cartão de Crédito', 
        codigo: 'CCRED', 
        tipo: 'CARTAO_CREDITO', 
        permite_parcelamento: true, 
        dias_compensacao: 30,
        taxa_percentual: 3.5,
        visivel_vendas: true, 
        visivel_compras: false 
      },
      { 
        nome: 'Boleto Bancário', 
        codigo: 'BOL', 
        tipo: 'BOLETO', 
        permite_parcelamento: true, 
        dias_compensacao: 2,
        taxa_percentual: 0,
        taxa_fixa: 3.50,
        visivel_vendas: true, 
        visivel_compras: true 
      },
      { 
        nome: 'Transferência Bancária', 
        codigo: 'TRANSF', 
        tipo: 'TRANSFERENCIA', 
        permite_parcelamento: false, 
        dias_compensacao: 1,
        taxa_percentual: 0,
        visivel_vendas: true, 
        visivel_compras: true 
      },
      { 
        nome: 'Cheque', 
        codigo: 'CHQ', 
        tipo: 'CHEQUE', 
        permite_parcelamento: true, 
        dias_compensacao: 3,
        taxa_percentual: 0,
        visivel_vendas: true, 
        visivel_compras: true 
      }
    ];

    for (const forma of formasDefault) {
      try {
        await connection.query(`
          INSERT INTO formas_pagamento 
          (nome, codigo, tipo, permite_parcelamento, dias_compensacao, taxa_percentual, taxa_fixa, visivel_vendas, visivel_compras)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            codigo = VALUES(codigo),
            tipo = VALUES(tipo),
            permite_parcelamento = VALUES(permite_parcelamento),
            dias_compensacao = VALUES(dias_compensacao),
            taxa_percentual = VALUES(taxa_percentual),
            taxa_fixa = VALUES(taxa_fixa),
            visivel_vendas = VALUES(visivel_vendas),
            visivel_compras = VALUES(visivel_compras)
        `, [
          forma.nome, forma.codigo, forma.tipo, forma.permite_parcelamento, 
          forma.dias_compensacao, forma.taxa_percentual, forma.taxa_fixa || 0, 
          forma.visivel_vendas, forma.visivel_compras
        ]);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error(`Erro ao inserir forma ${forma.nome}:`, err.message);
        }
      }
    }

    console.log('✅ Formas de pagamento padrão inseridas!');

    // Criar relacionamentos automáticos
    console.log('🔗 Criando relacionamentos entre formas e planos...');

    // Dinheiro e PIX -> apenas À Vista
    await connection.query(`
      INSERT IGNORE INTO formas_pagamento_planos (forma_pagamento_id, plano_pagamento_id)
      SELECT f.id, p.id
      FROM formas_pagamento f
      CROSS JOIN planos_pagamento p
      WHERE f.tipo IN ('DINHEIRO', 'PIX')
      AND p.codigo = 'AV'
    `);

    // Cartão de Débito -> À Vista
    await connection.query(`
      INSERT IGNORE INTO formas_pagamento_planos (forma_pagamento_id, plano_pagamento_id)
      SELECT f.id, p.id
      FROM formas_pagamento f
      CROSS JOIN planos_pagamento p
      WHERE f.tipo = 'CARTAO_DEBITO'
      AND p.codigo = 'AV'
    `);

    // Cartão de Crédito -> pode parcelar (2x, 3x, 5x, 10x)
    await connection.query(`
      INSERT IGNORE INTO formas_pagamento_planos (forma_pagamento_id, plano_pagamento_id)
      SELECT f.id, p.id
      FROM formas_pagamento f
      CROSS JOIN planos_pagamento p
      WHERE f.tipo = 'CARTAO_CREDITO'
      AND p.codigo IN ('AV', '2X', '3X', '5X', '10X')
    `);

    // Boleto -> pode parcelar e prazo
    await connection.query(`
      INSERT IGNORE INTO formas_pagamento_planos (forma_pagamento_id, plano_pagamento_id)
      SELECT f.id, p.id
      FROM formas_pagamento f
      CROSS JOIN planos_pagamento p
      WHERE f.tipo = 'BOLETO'
      AND p.codigo IN ('AV', '30D', '30/60', '30/60/90', '30+30')
    `);

    // Transferência e Cheque -> todos os planos
    await connection.query(`
      INSERT IGNORE INTO formas_pagamento_planos (forma_pagamento_id, plano_pagamento_id)
      SELECT f.id, p.id
      FROM formas_pagamento f
      CROSS JOIN planos_pagamento p
      WHERE f.tipo IN ('TRANSFERENCIA', 'CHEQUE')
    `);

    console.log('✅ Relacionamentos criados!');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas de formas de pagamento:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  criarTabelaFormasPagamento()
    .then(() => {
      console.log('\n✅ Processo concluído!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = criarTabelaFormasPagamento;
