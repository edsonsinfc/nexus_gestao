const pool = require('../config/db.mysql');

async function registrarNotificacaoIfNeeded(conn, equipe_id, tipo, mensagem) {
  await conn.execute(
    'INSERT INTO notificacoes (equipe_id, tipo, mensagem, data, status) VALUES (?, ?, ?, NOW(), ?)',
    [equipe_id, tipo, mensagem, 'pendente']
  );
}

async function checarAlertaSaldo(conn, equipe_id) {
  const [[eq]] = await conn.execute('SELECT limite_total, saldo_atual FROM equipes WHERE id = ?', [equipe_id]);
  if (!eq) return;
  if (eq.limite_total <= 0) return;
  const perc = (eq.saldo_atual / eq.limite_total) * 100;
  if (perc <= 10) {
    await registrarNotificacaoIfNeeded(conn, equipe_id, 'SALDO_BAIXO', 'Saldo abaixo de 10%. Considere aumentar o limite ou revisar o consumo.');
  }
}

module.exports = { registrarNotificacaoIfNeeded, checarAlertaSaldo };
