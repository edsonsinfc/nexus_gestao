const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateConfigFiscalAddPix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_dev'
  });

  try {
    console.log('🔧 Verificando/Adicionando campos de Integração PIX em configuracoes_fiscais...');

    const colunas = [
      { nome: 'pix_provider', tipo: "VARCHAR(50) NULL" },
      { nome: 'pix_ambiente', tipo: "ENUM('HOMOLOGACAO','PRODUCAO') DEFAULT 'HOMOLOGACAO'" },
      { nome: 'pix_base_url', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_client_id', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_client_secret', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_webhook_url', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_webhook_token', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_ispb', tipo: 'VARCHAR(20) NULL' },
      { nome: 'pix_agencia', tipo: 'VARCHAR(20) NULL' },
      { nome: 'pix_conta', tipo: 'VARCHAR(30) NULL' },
      { nome: 'pix_tipo_conta', tipo: "ENUM('CC','CP') NULL" },
      { nome: 'pix_chave', tipo: 'VARCHAR(120) NULL' }
    ];

    for (const col of colunas) {
      const [exists] = await connection.execute(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracoes_fiscais' AND COLUMN_NAME = ?",
        [col.nome]
      );
      if (exists.length === 0) {
        const alter = `ALTER TABLE configuracoes_fiscais ADD COLUMN ${col.nome} ${col.tipo}`;
        console.log('➡️  Adicionando coluna:', alter);
        await connection.execute(alter);
      }
    }

    console.log('✅ Campos de Integração PIX verificados/atualizados com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao atualizar configuracoes_fiscais:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  updateConfigFiscalAddPix();
}

module.exports = updateConfigFiscalAddPix;
