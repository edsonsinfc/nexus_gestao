/**
 * Migration: Upgrade Tabela Produtos - Campos Profissionais
 * Data: 11/11/2025
 * Descrição: Adiciona campos fiscais, tributários, estoque e comerciais
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function up() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🚀 Iniciando upgrade da tabela produtos...\n');

    // 1. Adicionar campos fiscais/tributários
    console.log('📋 Adicionando campos fiscais...');
    
    // Verificar e adicionar cada coluna individualmente
    const fiscalColumns = [
      { name: 'ncm', def: "VARCHAR(10) COMMENT 'Nomenclatura Comum do Mercosul'" },
      { name: 'cest', def: "VARCHAR(10) COMMENT 'Código Especificador da Substituição Tributária'" },
      { name: 'cfop_padrao', def: "VARCHAR(5) COMMENT 'CFOP padrão para saídas'" },
      { name: 'cst_csosn', def: "VARCHAR(4) COMMENT 'CST/CSOSN'" },
      { name: 'origem', def: "TINYINT DEFAULT 0 COMMENT '0-Nacional, 1-Estrangeira, etc'" },
      { name: 'aliquota_icms', def: "DECIMAL(5,2) DEFAULT 0 COMMENT '% ICMS'" },
      { name: 'aliquota_ipi', def: "DECIMAL(5,2) DEFAULT 0 COMMENT '% IPI'" },
      { name: 'aliquota_pis', def: "DECIMAL(5,2) DEFAULT 0 COMMENT '% PIS'" },
      { name: 'aliquota_cofins', def: "DECIMAL(5,2) DEFAULT 0 COMMENT '% COFINS'" }
    ];

    for (const col of fiscalColumns) {
      try {
        await connection.execute(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${col.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 2. Adicionar campos de estoque
    console.log('📦 Adicionando campos de estoque...');
    
    const estoqueColumns = [
      { name: 'estoque_atual', def: "DECIMAL(10,3) DEFAULT 0 COMMENT 'Estoque atual físico'" },
      { name: 'estoque_minimo', def: "DECIMAL(10,3) DEFAULT 0 COMMENT 'Estoque mínimo'" },
      { name: 'estoque_maximo', def: "DECIMAL(10,3) DEFAULT 0 COMMENT 'Estoque máximo'" },
      { name: 'localizacao', def: "VARCHAR(50) COMMENT 'Localização física do produto'" }
    ];

    for (const col of estoqueColumns) {
      try {
        await connection.execute(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${col.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 3. Adicionar campos comerciais
    console.log('💰 Adicionando campos comerciais...');
    
    const comercialColumns = [
      { name: 'preco_custo', def: "DECIMAL(10,2) DEFAULT 0 COMMENT 'Preço de custo'" },
      { name: 'preco_venda', def: "DECIMAL(10,2) DEFAULT 0 COMMENT 'Preço de venda'" },
      { name: 'margem_lucro', def: "DECIMAL(5,2) COMMENT '% margem de lucro calculada'" },
      { name: 'comissao_vendedor', def: "DECIMAL(5,2) DEFAULT 0 COMMENT '% comissão do vendedor'" },
      { name: 'fornecedor_id', def: "INT COMMENT 'ID do fornecedor principal'" },
      { name: 'codigo_fornecedor', def: "VARCHAR(50) COMMENT 'Código do produto no fornecedor'" }
    ];

    for (const col of comercialColumns) {
      try {
        await connection.execute(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${col.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 4. Adicionar campos de medidas
    console.log('📏 Adicionando campos de medidas...');
    
    const medidasColumns = [
      { name: 'peso_liquido', def: "DECIMAL(10,3) COMMENT 'Peso líquido em kg'" },
      { name: 'peso_bruto', def: "DECIMAL(10,3) COMMENT 'Peso bruto em kg'" },
      { name: 'largura', def: "DECIMAL(10,2) COMMENT 'Largura em cm'" },
      { name: 'altura', def: "DECIMAL(10,2) COMMENT 'Altura em cm'" },
      { name: 'profundidade', def: "DECIMAL(10,2) COMMENT 'Profundidade em cm'" }
    ];

    for (const col of medidasColumns) {
      try {
        await connection.execute(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${col.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 5. Adicionar campos adicionais
    console.log('ℹ️ Adicionando campos adicionais...');
    
    const adicionaisColumns = [
      { name: 'tipo_produto', def: "ENUM('REVENDA', 'INDUSTRIALIZACAO', 'SERVICO', 'CONSUMO') DEFAULT 'REVENDA'" },
      { name: 'observacoes_fiscais', def: "TEXT COMMENT 'Observações para nota fiscal'" },
      { name: 'foto_url', def: "VARCHAR(500) COMMENT 'URL da foto do produto'" },
      { name: 'ativo', def: "BOOLEAN DEFAULT 1 COMMENT 'Produto ativo/inativo'" },
      { name: 'destaque', def: "BOOLEAN DEFAULT 0 COMMENT 'Produto em destaque'" }
    ];

    for (const col of adicionaisColumns) {
      try {
        await connection.execute(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${col.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 6. Adicionar campos de controle (se não existirem)
    console.log('🕐 Verificando campos de controle...');
    
    const controleColumns = [
      { name: 'created_at', def: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
      { name: 'updated_at', def: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
      { name: 'created_by', def: "INT COMMENT 'ID do usuário que criou'" },
      { name: 'updated_by', def: "INT COMMENT 'ID do último usuário que atualizou'" }
    ];

    for (const col of controleColumns) {
      try {
        await connection.execute(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${col.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 7. Criar índices para performance
    console.log('🔍 Criando índices...');
    
    const indices = [
      { name: 'idx_produtos_ncm', sql: 'CREATE INDEX idx_produtos_ncm ON produtos(ncm)' },
      { name: 'idx_produtos_ativo', sql: 'CREATE INDEX idx_produtos_ativo ON produtos(ativo)' },
      { name: 'idx_produtos_tipo', sql: 'CREATE INDEX idx_produtos_tipo ON produtos(tipo_produto)' },
      { name: 'idx_produtos_fornecedor', sql: 'CREATE INDEX idx_produtos_fornecedor ON produtos(fornecedor_id)' }
    ];

    for (const idx of indices) {
      try {
        await connection.execute(idx.sql);
        console.log(`  ✓ ${idx.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`  - ${idx.name} (já existe)`);
        } else {
          throw err;
        }
      }
    }

    // 8. Atualizar produtos existentes com valores padrão
    console.log('🔄 Atualizando produtos existentes...');
    await connection.execute(`
      UPDATE produtos 
      SET 
        ativo = 1,
        tipo_produto = 'REVENDA',
        origem = 0
      WHERE ativo IS NULL OR tipo_produto IS NULL OR origem IS NULL
    `);

    // 9. Verificar estrutura final
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM produtos
    `);

    console.log('\n✅ Migração concluída com sucesso!\n');
    console.log('📊 Estrutura final da tabela produtos:');
    console.log('═'.repeat(80));
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('═'.repeat(80));

    // 10. Contar produtos
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM produtos');
    console.log(`\n📦 Total de produtos no banco: ${count[0].total}`);

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('⏪ Revertendo migração...\n');

    await connection.execute(`
      ALTER TABLE produtos
      DROP COLUMN IF EXISTS ncm,
      DROP COLUMN IF EXISTS cest,
      DROP COLUMN IF EXISTS cfop_padrao,
      DROP COLUMN IF EXISTS cst_csosn,
      DROP COLUMN IF EXISTS origem,
      DROP COLUMN IF EXISTS aliquota_icms,
      DROP COLUMN IF EXISTS aliquota_ipi,
      DROP COLUMN IF EXISTS aliquota_pis,
      DROP COLUMN IF EXISTS aliquota_cofins,
      DROP COLUMN IF EXISTS estoque_atual,
      DROP COLUMN IF EXISTS estoque_minimo,
      DROP COLUMN IF EXISTS estoque_maximo,
      DROP COLUMN IF EXISTS localizacao,
      DROP COLUMN IF EXISTS preco_custo,
      DROP COLUMN IF EXISTS preco_venda,
      DROP COLUMN IF EXISTS margem_lucro,
      DROP COLUMN IF EXISTS comissao_vendedor,
      DROP COLUMN IF EXISTS fornecedor_id,
      DROP COLUMN IF EXISTS codigo_fornecedor,
      DROP COLUMN IF EXISTS peso_liquido,
      DROP COLUMN IF EXISTS peso_bruto,
      DROP COLUMN IF EXISTS largura,
      DROP COLUMN IF EXISTS altura,
      DROP COLUMN IF EXISTS profundidade,
      DROP COLUMN IF EXISTS tipo_produto,
      DROP COLUMN IF EXISTS observacoes_fiscais,
      DROP COLUMN IF EXISTS foto_url,
      DROP COLUMN IF EXISTS ativo,
      DROP COLUMN IF EXISTS destaque,
      DROP COLUMN IF EXISTS created_by,
      DROP COLUMN IF EXISTS updated_by
    `);

    console.log('✅ Migração revertida com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro ao reverter migração:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Executar migração
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { up, down };
