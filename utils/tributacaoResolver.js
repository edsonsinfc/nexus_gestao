// utils/tributacaoResolver.js
// Resolve figuras tributárias (saída) por produto/NCM e monta campos fiscais para NFC-e

/**
 * Normaliza NCM para dígitos (mantém vazio se inválido)
 * @param {string|number|null|undefined} ncm
 * @returns {string|null}
 */
function normalizeNcm(ncm) {
  if (!ncm) return null;
  const s = String(ncm).replace(/\D/g, '');
  return s.length > 0 ? s : null;
}

/**
 * Calcula "especificidade" do padrão NCM (quantidade de dígitos não coringa)
 * Ex.: 84713000 => 8 | 8471* => 4 | 84* => 2
 */
function ncmPatternSpecificity(pattern) {
  if (!pattern) return 0;
  const clean = String(pattern).replace(/\D/g, ''); // remove não dígitos (mantemos coringas implicitamente)
  return clean.length;
}

/**
 * Verifica se um NCM corresponde a um padrão com coringas ("*")
 * @param {string} ncm - somente dígitos
 * @param {string} pattern - pode conter dígitos e '*'
 */
function matchNcmPattern(ncm, pattern) {
  if (!ncm || !pattern) return false;
  const p = String(pattern).trim();
  // Aceita padrões como "8471*", "84*", "12345678" (exato)
  const regex = new RegExp('^' + p.replace(/[^0-9*]/g, '').replace(/\*/g, '.*') + '$');
  return regex.test(ncm);
}

/**
 * Busca a figura de saída vinculada diretamente ao produto
 * @param {any} conn - conexão/pool com método execute
 */
async function getFiguraSaidaPorProduto(conn, produtoId) {
  const [rows] = await conn.execute(
    `SELECT f.*
     FROM produtos_trib_saida ps
     JOIN trib_figuras_saida f ON f.id = ps.figura_saida_id
     WHERE ps.produto_id = ? AND f.ativo = 1
     LIMIT 1`,
    [produtoId]
  );
  return rows[0] || null;
}

/**
 * Busca a melhor figura de saída por NCM, com prioridade para padrões mais específicos
 * @param {any} conn - conexão/pool com método execute
 */
async function getFiguraSaidaPorNcm(conn, ncm) {
  const normalized = normalizeNcm(ncm);
  if (!normalized) return null;

  const [maps] = await conn.execute(
    `SELECT m.id as map_id, m.ncm_pattern, f.*
     FROM trib_saida_ncm_map m
     JOIN trib_figuras_saida f ON f.id = m.figura_saida_id
     WHERE f.ativo = 1`
  );

  // Filtra os que casam e ordena por especificidade desc, depois id desc (mais recente)
  const matches = maps
    .filter(r => matchNcmPattern(normalized, r.ncm_pattern))
    .sort((a, b) => {
      const sa = ncmPatternSpecificity(a.ncm_pattern);
      const sb = ncmPatternSpecificity(b.ncm_pattern);
      if (sb !== sa) return sb - sa; // mais específico primeiro
      return (b.map_id || 0) - (a.map_id || 0);
    });

  return matches[0] || null;
}

/**
 * Resolve figura de saída para um item (produto > NCM > null)
 * @returns {{ figura: object|null, origem: 'produto'|'ncm'|'none', matched_pattern?: string }}
 */
async function resolveFiguraSaida(conn, produtoId, ncm) {
  // 1. por produto
  const figProduto = await getFiguraSaidaPorProduto(conn, produtoId);
  if (figProduto) return { figura: figProduto, origem: 'produto' };

  // 2. por NCM
  const figNcm = await getFiguraSaidaPorNcm(conn, ncm);
  if (figNcm) return { figura: figNcm, origem: 'ncm', matched_pattern: figNcm.ncm_pattern };

  // 3. nada encontrado
  return { figura: null, origem: 'none' };
}

/**
 * Monta campos fiscais do item a partir da figura e do regime da empresa
 * OBS: nfce_itens_fiscal usa coluna cst_icms; para Simples, gravamos CSOSN nessa coluna.
 */
function montarCamposItemSaida(figura, regimeTributario) {
  const regime = String(regimeTributario || '').toUpperCase();
  const isSN = regime === 'SIMPLES_NACIONAL' || regime === 'SIMPLES' || regime === 'SN';

  const cfop = figura?.cfop || '5102';
  const origem_produto = figura?.origem ?? 0;

  // Escolhe código ICMS: CSOSN para Simples; CST para demais
  const cst_icms = isSN
    ? (figura?.csosn || '102')
    : (figura?.cst_icms || '00');

  const aliquota_icms = Number(figura?.icms_aliquota ?? 0) || 0;
  const pis_cst = figura?.pis_cst || '49';
  const pis_aliquota = Number(figura?.pis_aliquota ?? 0) || 0;
  const cofins_cst = figura?.cofins_cst || '49';
  const cofins_aliquota = Number(figura?.cofins_aliquota ?? 0) || 0;

  return {
    cfop,
    origem_produto,
    cst_icms,
    aliquota_icms,
    pis_cst,
    pis_aliquota,
    cofins_cst,
    cofins_aliquota
  };
}

module.exports = {
  normalizeNcm,
  resolveFiguraSaida,
  montarCamposItemSaida,
};
