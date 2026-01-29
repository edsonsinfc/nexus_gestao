// Habilita pix_debug = 1 na tabela configuracoes_fiscais para o registro ativo
// Uso: node migrations/20251029_enable_pix_debug.js

const pool = require('../src/config/db');

(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('🔧 Habilitando pix_debug na configuração fiscal ativa...');
    const [rows] = await conn.query('SELECT id, pix_debug FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
    if (!rows || rows.length === 0) {
      console.log('⚠️ Nenhuma configuração fiscal ativa encontrada. Nada a fazer.');
      process.exit(0);
    }
    const id = rows[0].id;
    await conn.query('UPDATE configuracoes_fiscais SET pix_debug = 1, updated_at = NOW() WHERE id = ?', [id]);
    console.log('✅ pix_debug habilitado (id=', id, ')');
  } catch (err) {
    console.error('❌ Erro ao habilitar pix_debug:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
})();
