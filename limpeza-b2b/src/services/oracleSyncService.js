const oracledb = require('oracledb');
const { getOracleConnection } = require('../config/db.oracle');

async function syncPedidoOracle(pedido, itens) {
  // Estrutura mínima: inserir em PCPEDC (cabeçalho) e PCPEDI (itens)
  // ATENÇÃO: Ajuste nomes de colunas conforme o ERP
  const conn = await getOracleConnection();
  let mustClose = true;
  const txId = 'WEB' + Date.now();
  try {
    await conn.execute('BEGIN NULL; END;'); // garante sessão
    // Cabeçalho
    await conn.execute(
      `INSERT INTO PCPEDC (NUMTRANS, CODCLI, DATA, TOTALPED) VALUES (:numtrans, :codcli, SYSDATE, :total)`,
      { numtrans: txId, codcli: pedido.equipe_id, total: pedido.valor_total },
      { autoCommit: false }
    );
    // Itens
    for (const it of itens) {
      await conn.execute(
        `INSERT INTO PCPEDI (NUMTRANS, CODPROD, QTD, PRECO) VALUES (:numtrans, :codprod, :qtd, :preco)`,
        { numtrans: txId, codprod: it.codprod, qtd: it.quantidade, preco: it.valor_unitario },
        { autoCommit: false }
      );
    }
    await conn.commit();
    return { protocolo: txId };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    if (mustClose) { try { await conn.close(); } catch {} }
  }
}

module.exports = { syncPedidoOracle };
