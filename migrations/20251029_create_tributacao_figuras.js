const pool = require('../src/config/db');
require('dotenv').config();

async function createTributacaoTables() {
  const connection = await pool.getConnection();

  try {
    console.log('🧾 Criando tabelas de Tributação (figuras e mapeamentos)...');

    // Figuras de Entrada
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trib_figuras_entrada (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nome VARCHAR(100) NOT NULL,
        descricao VARCHAR(255),
        cfop VARCHAR(10),
        origem TINYINT DEFAULT 0,
        cst_icms VARCHAR(3),
        csosn VARCHAR(3),
        icms_modalidade VARCHAR(20),
        icms_aliquota DECIMAL(7,4) DEFAULT 0,
        icms_reducao_bc DECIMAL(7,4) DEFAULT 0,
        fcp_aliquota DECIMAL(7,4) DEFAULT 0,
        ipi_cst VARCHAR(3),
        ipi_aliquota DECIMAL(7,4) DEFAULT 0,
        pis_cst VARCHAR(3),
        pis_aliquota DECIMAL(7,4) DEFAULT 0,
        cofins_cst VARCHAR(3),
        cofins_aliquota DECIMAL(7,4) DEFAULT 0,
        ativo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Figuras de Saída
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trib_figuras_saida (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nome VARCHAR(100) NOT NULL,
        descricao VARCHAR(255),
        cfop VARCHAR(10),
        origem TINYINT DEFAULT 0,
        cst_icms VARCHAR(3),
        csosn VARCHAR(3),
        icms_modalidade VARCHAR(20),
        icms_aliquota DECIMAL(7,4) DEFAULT 0,
        icms_reducao_bc DECIMAL(7,4) DEFAULT 0,
        fcp_aliquota DECIMAL(7,4) DEFAULT 0,
        ipi_cst VARCHAR(3),
        ipi_aliquota DECIMAL(7,4) DEFAULT 0,
        pis_cst VARCHAR(3),
        pis_aliquota DECIMAL(7,4) DEFAULT 0,
        cofins_cst VARCHAR(3),
        cofins_aliquota DECIMAL(7,4) DEFAULT 0,
        ativo TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Mapeamentos NCM → Figura Entrada
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trib_entrada_ncm_map (
        id INT PRIMARY KEY AUTO_INCREMENT,
        figura_entrada_id INT NOT NULL,
        ncm_pattern VARCHAR(10) NOT NULL,
        observacao VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (figura_entrada_id) REFERENCES trib_figuras_entrada(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_figura_ncm (figura_entrada_id, ncm_pattern)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Mapeamentos NCM → Figura Saída
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trib_saida_ncm_map (
        id INT PRIMARY KEY AUTO_INCREMENT,
        figura_saida_id INT NOT NULL,
        ncm_pattern VARCHAR(10) NOT NULL,
        observacao VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (figura_saida_id) REFERENCES trib_figuras_saida(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_figura_ncm (figura_saida_id, ncm_pattern)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Vínculo direto Produto → Figura Entrada
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS produtos_trib_entrada (
        produto_id INT NOT NULL,
        figura_entrada_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (produto_id),
        KEY idx_figura_entrada_id (figura_entrada_id),
        FOREIGN KEY (figura_entrada_id) REFERENCES trib_figuras_entrada(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Vínculo direto Produto → Figura Saída
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS produtos_trib_saida (
        produto_id INT NOT NULL,
        figura_saida_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (produto_id),
        KEY idx_figura_saida_id (figura_saida_id),
        FOREIGN KEY (figura_saida_id) REFERENCES trib_figuras_saida(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tabelas de Tributação criadas/garantidas.');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas de Tributação:', error.message);
    throw error;
  } finally {
    connection.release();
    pool.end();
  }
}

if (require.main === module) {
  createTributacaoTables();
}

module.exports = createTributacaoTables;
