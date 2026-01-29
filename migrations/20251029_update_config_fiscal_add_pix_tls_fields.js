const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateConfigFiscalAddPixTLS() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_dev'
  });

  try {
    console.log('🔧 Verificando/Adicionando campos de Certificados/TLS do PIX em configuracoes_fiscais...');

    const colunas = [
      { nome: 'pix_cert_pfx_path', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_cert_pfx_password', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_cert_cert_path', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_cert_key_path', tipo: 'VARCHAR(255) NULL' },
      { nome: 'pix_cert_ca_path', tipo: 'VARCHAR(255) NULL' }
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

    console.log('✅ Campos de Certificados/TLS do PIX verificados/atualizados com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao atualizar configuracoes_fiscais (TLS PIX):', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  updateConfigFiscalAddPixTLS();
}

module.exports = updateConfigFiscalAddPixTLS;
