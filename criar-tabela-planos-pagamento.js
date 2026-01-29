const pool = require('./db');

async function criarTabelaPlanosPagamento() {
  try {
    console.log('🔧 Criando tabela planos_pagamento...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS planos_pagamento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        codigo VARCHAR(20),
        parcelas INT NOT NULL DEFAULT 1,
        intervalo_dias INT DEFAULT 30,
        percentual_entrada DECIMAL(5,2) DEFAULT 0,
        visivel_vendas BOOLEAN DEFAULT TRUE,
        visivel_compras BOOLEAN DEFAULT TRUE,
        ativo BOOLEAN DEFAULT TRUE,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tabela planos_pagamento criada!');

    // Inserir planos padrão
    console.log('📝 Inserindo planos de pagamento padrão...');

    const planosDefault = [
      { nome: 'À Vista', codigo: 'AV', parcelas: 1, intervalo_dias: 0, percentual_entrada: 0, visivel_vendas: true, visivel_compras: true },
      { nome: '30 Dias', codigo: '30D', parcelas: 1, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: true },
      { nome: '30/60 Dias', codigo: '30/60', parcelas: 2, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: true },
      { nome: '30/60/90 Dias', codigo: '30/60/90', parcelas: 3, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: true },
      { nome: '2x Sem Juros', codigo: '2X', parcelas: 2, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: false },
      { nome: '3x Sem Juros', codigo: '3X', parcelas: 3, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: false },
      { nome: '5x Sem Juros', codigo: '5X', parcelas: 5, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: false },
      { nome: '10x Sem Juros', codigo: '10X', parcelas: 10, intervalo_dias: 30, percentual_entrada: 0, visivel_vendas: true, visivel_compras: false },
      { nome: '30 + 30 Dias', codigo: '30+30', parcelas: 2, intervalo_dias: 30, percentual_entrada: 50, visivel_vendas: true, visivel_compras: true }
    ];

    for (const plano of planosDefault) {
      try {
        await pool.query(`
          INSERT INTO planos_pagamento (nome, codigo, parcelas, intervalo_dias, percentual_entrada, visivel_vendas, visivel_compras)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            codigo = VALUES(codigo),
            parcelas = VALUES(parcelas),
            intervalo_dias = VALUES(intervalo_dias),
            percentual_entrada = VALUES(percentual_entrada),
            visivel_vendas = VALUES(visivel_vendas),
            visivel_compras = VALUES(visivel_compras)
        `, [plano.nome, plano.codigo, plano.parcelas, plano.intervalo_dias, plano.percentual_entrada, plano.visivel_vendas, plano.visivel_compras]);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error(`Erro ao inserir plano ${plano.nome}:`, err.message);
        }
      }
    }

    console.log('✅ Planos de pagamento padrão inseridos!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela planos_pagamento:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  criarTabelaPlanosPagamento()
    .then(() => {
      console.log('✅ Processo concluído!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = criarTabelaPlanosPagamento;
