// scripts/generate_webhook_token.js
// Gera um token seguro (Base64URL 256-bit) e salva em configuracoes_fiscais.pix_webhook_token
// Uso:
//   node scripts/generate_webhook_token.js            # gera se não existir token
//   node scripts/generate_webhook_token.js --force    # sobrescreve mesmo se já existir

const crypto = require('crypto');
const pool = require('../src/config/db');

function base64UrlFromBuffer(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

async function main() {
  const force = process.argv.includes('--force');
  const [rows] = await pool.execute('SELECT id, pix_webhook_token FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
  if (!rows || rows.length === 0) {
    console.error('Nenhum registro ativo encontrado em configuracoes_fiscais');
    process.exit(1);
  }
  const { id, pix_webhook_token } = rows[0];
  if (pix_webhook_token && !force) {
    console.log('Já existe um token cadastrado. Use --force para sobrescrever.');
    console.log('Token atual (mascarado):', `${'•'.repeat(Math.max(4, pix_webhook_token.length - 4))}${pix_webhook_token.slice(-4)}`);
    process.exit(0);
  }
  const token = base64UrlFromBuffer(crypto.randomBytes(32)); // 256-bit
  await pool.execute('UPDATE configuracoes_fiscais SET pix_webhook_token = ?, updated_at = NOW() WHERE id = ?', [token, id]);
  console.log('Novo token de webhook gerado e salvo com sucesso.');
  console.log('IMPORTANTE: Configure este mesmo token no seu banco para o webhook.');
  console.log('Token:', token);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Erro ao gerar/salvar token:', err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
