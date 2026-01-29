const { getOracleConnection } = require('../config/db.oracle');

async function getProdutosOracle({ search, categoria, fornecedor, codigo }) {
  const conn = await getOracleConnection();
  try {
    const binds = {};
    let where = ' WHERE 1=1 ';
    if (search) { where += ' AND (UPPER(DESCRICAO) LIKE UPPER(:search) OR CODPROD LIKE :search)'; binds.search = `%${search}%`; }
    if (codigo) { where += ' AND CODPROD = :codigo'; binds.codigo = String(codigo); }
    // exemplo de colunas comuns em PCPRODUT (ajuste conforme ERP real)
    const sql = `SELECT CODPROD, DESCRICAO, CODFORNEC, CODSEC FROM PCPRODUT ${where} FETCH FIRST 100 ROWS ONLY`;
    let outFormat;
    try {
      // lazy require para constante de formato
      outFormat = require('oracledb').OUT_FORMAT_OBJECT;
    } catch (_) {
      outFormat = undefined; // fallback
    }
    const result = await conn.execute(sql, binds, outFormat ? { outFormat } : {});
    return (result.rows || []).map(r => ({
      codprod: r.CODPROD ?? (r[0]),
      descricao: r.DESCRICAO ?? (r[1]),
      fornecedor: r.CODFORNEC ?? (r[2]),
      categoria: r.CODSEC ?? (r[3])
    }));
  } finally {
    try { await conn.close(); } catch {}
  }
}

module.exports = { getProdutosOracle };
