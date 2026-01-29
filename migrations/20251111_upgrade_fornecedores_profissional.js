const mysql = require('mysql2/promise');
require('dotenv').config();

async function up() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_gestao'
  });

  try {
    console.log('🚀 Iniciando upgrade da tabela fornecedores...');

    // ==========================================
    // CLASSIFICAÇÃO
    // ==========================================
    console.log('🏷️ Adicionando campos de classificação...');
    const camposClassificacao = [
      { name: 'tipo_fornecedor', def: "ENUM('MATERIA_PRIMA','MERCADORIA','SERVICO','OUTROS') DEFAULT 'MERCADORIA'" },
      { name: 'categoria_fornecedor', def: 'VARCHAR(50)' },
      { name: 'porte_empresa', def: "ENUM('MEI','ME','EPP','MEDIO','GRANDE')" }
    ];

    for (const campo of camposClassificacao) {
      try {
        await connection.execute(`ALTER TABLE fornecedores ADD COLUMN ${campo.name} ${campo.def}`);
        console.log(`  ✓ ${campo.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${campo.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // CONTATOS COMPLETOS
    // ==========================================
    console.log('📱 Adicionando campos de contatos...');
    const camposContatos = [
      { name: 'celular', def: 'VARCHAR(20) AFTER telefone' },
      { name: 'whatsapp', def: 'VARCHAR(20) AFTER celular' },
      { name: 'site', def: 'VARCHAR(150) AFTER email' },
      { name: 'contato_compras_nome', def: 'VARCHAR(100)' },
      { name: 'contato_compras_telefone', def: 'VARCHAR(20)' },
      { name: 'contato_compras_email', def: 'VARCHAR(100)' },
      { name: 'contato_financeiro_nome', def: 'VARCHAR(100)' },
      { name: 'contato_financeiro_telefone', def: 'VARCHAR(20)' },
      { name: 'contato_financeiro_email', def: 'VARCHAR(100)' }
    ];

    for (const campo of camposContatos) {
      try {
        await connection.execute(`ALTER TABLE fornecedores ADD COLUMN ${campo.name} ${campo.def}`);
        console.log(`  ✓ ${campo.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${campo.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // DADOS BANCÁRIOS
    // ==========================================
    console.log('🏦 Adicionando dados bancários...');
    const camposBancarios = [
      { name: 'banco', def: 'VARCHAR(50)' },
      { name: 'agencia', def: 'VARCHAR(10)' },
      { name: 'conta', def: 'VARCHAR(20)' },
      { name: 'pix', def: 'VARCHAR(100)' },
      { name: 'favorecido', def: 'VARCHAR(150)' }
    ];

    for (const campo of camposBancarios) {
      try {
        await connection.execute(`ALTER TABLE fornecedores ADD COLUMN ${campo.name} ${campo.def}`);
        console.log(`  ✓ ${campo.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${campo.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // CONDIÇÕES COMERCIAIS
    // ==========================================
    console.log('💼 Adicionando condições comerciais...');
    const camposComerciais = [
      { name: 'prazo_pagamento_padrao', def: 'VARCHAR(50)' },
      { name: 'forma_pagamento_preferencial', def: 'VARCHAR(50)' },
      { name: 'dia_entrega', def: 'VARCHAR(50)' },
      { name: 'prazo_entrega_dias', def: 'INT DEFAULT 0' },
      { name: 'pedido_minimo', def: 'DECIMAL(15,2) DEFAULT 0.00' },
      { name: 'frete_tipo', def: "ENUM('CIF','FOB','ISENTO') DEFAULT 'CIF'" },
      { name: 'desconto_maximo', def: 'DECIMAL(5,2) DEFAULT 0.00' }
    ];

    for (const campo of camposComerciais) {
      try {
        await connection.execute(`ALTER TABLE fornecedores ADD COLUMN ${campo.name} ${campo.def}`);
        console.log(`  ✓ ${campo.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${campo.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // ENDEREÇO COMPLETO
    // ==========================================
    console.log('📍 Adicionando campos de endereço...');
    const camposEndereco = [
      { name: 'numero', def: 'VARCHAR(10)' },
      { name: 'complemento', def: 'VARCHAR(50)' },
      { name: 'bairro', def: 'VARCHAR(100)' }
    ];

    for (const campo of camposEndereco) {
      try {
        await connection.execute(`ALTER TABLE fornecedores ADD COLUMN ${campo.name} ${campo.def}`);
        console.log(`  ✓ ${campo.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${campo.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // OUTRAS INFORMAÇÕES
    // ==========================================
    console.log('📝 Adicionando campos adicionais...');
    const camposAdicionais = [
      { name: 'observacoes', def: 'TEXT' },
      { name: 'observacoes_internas', def: 'TEXT' },
      { name: 'produtos_fornecidos', def: 'TEXT' },
      { name: 'ultima_compra', def: 'DATE' },
      { name: 'avaliacao', def: 'INT DEFAULT 0 COMMENT "Avaliação de 1 a 5 estrelas"' }
    ];

    for (const campo of camposAdicionais) {
      try {
        await connection.execute(`ALTER TABLE fornecedores ADD COLUMN ${campo.name} ${campo.def}`);
        console.log(`  ✓ ${campo.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${campo.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // CRIAR ÍNDICES
    // ==========================================
    console.log('🔍 Criando índices para melhor performance...');
    const indices = [
      { name: 'idx_fornecedores_tipo', column: 'tipo_fornecedor' },
      { name: 'idx_fornecedores_celular', column: 'celular' },
      { name: 'idx_fornecedores_avaliacao', column: 'avaliacao' }
    ];

    for (const index of indices) {
      try {
        await connection.execute(`CREATE INDEX ${index.name} ON fornecedores(${index.column})`);
        console.log(`  ✓ ${index.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`  - ${index.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // ==========================================
    // VERIFICAR RESULTADO
    // ==========================================
    console.log('\n✅ Migração concluída com sucesso!');
    
    const [columns] = await connection.execute('SHOW COLUMNS FROM fornecedores');
    console.log(`📦 Total de colunas na tabela fornecedores: ${columns.length}`);
    
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM fornecedores');
    console.log(`🏭 Total de fornecedores no banco: ${rows[0].total}`);

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
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
    console.log('⏪ Revertendo upgrade da tabela fornecedores...');

    const camposParaRemover = [
      'tipo_fornecedor', 'categoria_fornecedor', 'porte_empresa',
      'celular', 'whatsapp', 'site',
      'contato_compras_nome', 'contato_compras_telefone', 'contato_compras_email',
      'contato_financeiro_nome', 'contato_financeiro_telefone', 'contato_financeiro_email',
      'banco', 'agencia', 'conta', 'pix', 'favorecido',
      'prazo_pagamento_padrao', 'forma_pagamento_preferencial', 'dia_entrega', 'prazo_entrega_dias',
      'pedido_minimo', 'frete_tipo', 'desconto_maximo',
      'numero', 'complemento', 'bairro',
      'observacoes', 'observacoes_internas', 'produtos_fornecidos', 'ultima_compra', 'avaliacao'
    ];

    for (const campo of camposParaRemover) {
      try {
        await connection.execute(`ALTER TABLE fornecedores DROP COLUMN ${campo}`);
        console.log(`  ✓ Removido: ${campo}`);
      } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`  - ${campo} (não existe)`);
        } else {
          throw err;
        }
      }
    }

    // Remover índices
    const indices = ['idx_fornecedores_tipo', 'idx_fornecedores_celular', 'idx_fornecedores_avaliacao'];
    for (const index of indices) {
      try {
        await connection.execute(`DROP INDEX ${index} ON fornecedores`);
        console.log(`  ✓ Índice removido: ${index}`);
      } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`  - ${index} (não existe)`);
        }
      }
    }

    console.log('✅ Rollback concluído!');

  } catch (error) {
    console.error('❌ Erro no rollback:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Executar migration se chamado diretamente
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar migration:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
