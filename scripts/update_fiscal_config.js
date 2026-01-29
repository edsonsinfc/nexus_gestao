// Atualiza razao_social e nome_fantasia na tabela configuracoes_fiscais
// Uso: node scripts/update_fiscal_config.js "RAZAO SOCIAL" "NOME FANTASIA"

const pool = require('../src/config/db');

(async () => {
  const razao = process.argv[2];
  const fantasia = process.argv[3] || razao;

  if (!razao) {
    console.error('Uso: node scripts/update_fiscal_config.js "RAZAO SOCIAL" "NOME FANTASIA(opcional)"');
    process.exit(1);
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Garantir que exista um registro ativo
    const [rows] = await connection.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
    if (rows.length === 0) {
      console.error('Nenhuma configuracao fiscal ativa encontrada. Crie um registro em configuracoes_fiscais.');
      process.exit(2);
    }

    const id = rows[0].id;
    const [result] = await connection.execute(
      'UPDATE configuracoes_fiscais SET razao_social = ?, nome_fantasia = ?, updated_at = NOW() WHERE id = ?',
      [razao, fantasia, id]
    );

    console.log(`✔ Configurações fiscais atualizadas (id=${id})`);
    console.log('  - Razão Social  :', razao);
    console.log('  - Nome Fantasia :', fantasia);
  } catch (err) {
    console.error('Erro ao atualizar configuracoes fiscais:', err.message);
    process.exit(3);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
})();
