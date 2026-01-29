// scripts/upload_logo_fiscal.js
// Uso:
//   node scripts/upload_logo_fiscal.js "c:/caminho/para/logo.png"
// Lê o arquivo de imagem e grava em configuracoes_fiscais.logo do registro ativo.

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

(async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/upload_logo_fiscal.js "c:/caminho/para/logo.png"');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error('Arquivo não encontrado:', filePath);
    process.exit(2);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
    console.warn('Aviso: extensões recomendadas são .png ou .jpg; arquivo informado:', ext);
  }

  let connection;
  try {
    const buffer = fs.readFileSync(filePath);
    console.log('✔ Arquivo lido:', filePath, '- Tamanho:', buffer.length, 'bytes');

    connection = await pool.getConnection();

    const [rows] = await connection.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
    if (rows.length === 0) {
      console.error('Nenhuma configuracao fiscal ativa encontrada. Crie um registro em configuracoes_fiscais.');
      process.exit(3);
    }

    const id = rows[0].id;
    const [result] = await connection.execute(
      'UPDATE configuracoes_fiscais SET logo = ?, updated_at = NOW() WHERE id = ?',
      [buffer, id]
    );

    console.log(`✔ Logo atualizada para configuracoes_fiscais.id=${id}`);
  } catch (err) {
    console.error('Erro ao enviar logo:', err.message);
    process.exit(4);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
})();
