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
    console.log('🚀 Iniciando upgrade da tabela clientes...');

    // ==========================================
    // CONTATOS ADICIONAIS
    // ==========================================
    console.log('📱 Adicionando campos de contatos...');
    const camposContatos = [
      { name: 'celular', def: 'VARCHAR(20) AFTER email' },
      { name: 'whatsapp', def: 'VARCHAR(20) AFTER celular' },
      { name: 'telefone_comercial', def: 'VARCHAR(20) AFTER whatsapp' },
      { name: 'contato_nome', def: 'VARCHAR(100) AFTER telefone_comercial' },
      { name: 'contato_cargo', def: 'VARCHAR(50) AFTER contato_nome' }
    ];

    for (const campo of camposContatos) {
      try {
        await connection.execute(`ALTER TABLE clientes ADD COLUMN ${campo.name} ${campo.def}`);
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
    // DOCUMENTOS (PESSOA FÍSICA)
    // ==========================================
    console.log('🆔 Adicionando campos de documentos PF...');
    const camposDocumentos = [
      { name: 'rg', def: 'VARCHAR(20) AFTER cpf_cnpj' },
      { name: 'data_nascimento', def: 'DATE AFTER rg' },
      { name: 'sexo', def: "ENUM('M','F','O') AFTER data_nascimento" }
    ];

    for (const campo of camposDocumentos) {
      try {
        await connection.execute(`ALTER TABLE clientes ADD COLUMN ${campo.name} ${campo.def}`);
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
      { name: 'pix', def: 'VARCHAR(100)' }
    ];

    for (const campo of camposBancarios) {
      try {
        await connection.execute(`ALTER TABLE clientes ADD COLUMN ${campo.name} ${campo.def}`);
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
    // FINANCEIRO AVANÇADO
    // ==========================================
    console.log('💰 Adicionando campos financeiros...');
    const camposFinanceiros = [
      { name: 'condicao_pagamento_padrao', def: 'VARCHAR(50)' },
      { name: 'desconto_padrao', def: 'DECIMAL(5,2) DEFAULT 0.00' },
      { name: 'dia_vencimento_preferencial', def: 'INT' },
      { name: 'bloqueado_por_credito', def: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const campo of camposFinanceiros) {
      try {
        await connection.execute(`ALTER TABLE clientes ADD COLUMN ${campo.name} ${campo.def}`);
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
      { name: 'bairro', def: 'VARCHAR(100)' },
      { name: 'ponto_referencia', def: 'VARCHAR(150)' }
    ];

    for (const campo of camposEndereco) {
      try {
        await connection.execute(`ALTER TABLE clientes ADD COLUMN ${campo.name} ${campo.def}`);
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
      { name: 'ultimo_pedido', def: 'DATE' }
    ];

    for (const campo of camposAdicionais) {
      try {
        await connection.execute(`ALTER TABLE clientes ADD COLUMN ${campo.name} ${campo.def}`);
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
      { name: 'idx_clientes_celular', column: 'celular' },
      { name: 'idx_clientes_rg', column: 'rg' },
      { name: 'idx_clientes_bloqueado', column: 'bloqueado_por_credito' }
    ];

    for (const index of indices) {
      try {
        await connection.execute(`CREATE INDEX ${index.name} ON clientes(${index.column})`);
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
    
    const [columns] = await connection.execute('SHOW COLUMNS FROM clientes');
    console.log(`📦 Total de colunas na tabela clientes: ${columns.length}`);
    
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM clientes');
    console.log(`👥 Total de clientes no banco: ${rows[0].total}`);

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
    console.log('⏪ Revertendo upgrade da tabela clientes...');

    const camposParaRemover = [
      'celular', 'whatsapp', 'telefone_comercial', 'contato_nome', 'contato_cargo',
      'rg', 'data_nascimento', 'sexo',
      'banco', 'agencia', 'conta', 'pix',
      'condicao_pagamento_padrao', 'desconto_padrao', 'dia_vencimento_preferencial', 'bloqueado_por_credito',
      'numero', 'complemento', 'bairro', 'ponto_referencia',
      'observacoes', 'observacoes_internas', 'ultimo_pedido'
    ];

    for (const campo of camposParaRemover) {
      try {
        await connection.execute(`ALTER TABLE clientes DROP COLUMN ${campo}`);
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
    const indices = ['idx_clientes_celular', 'idx_clientes_rg', 'idx_clientes_bloqueado'];
    for (const index of indices) {
      try {
        await connection.execute(`DROP INDEX ${index} ON clientes`);
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
