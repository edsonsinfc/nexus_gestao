// integrations/pix/bb.js
// Integração com PIX do Banco do Brasil via OAuth2 + mTLS
// Observação: endpoints seguem convenção BACEN: /pix/cob, /pix/cob/{txid}
// Os paths exatos e escopos OAuth do BB podem variar — ajuste pix_base_url conforme documentação do banco.

const { buildHttpsAgent, getOAuthToken, apiClient, buildPixPath } = require('./http');
const QRCode = require('qrcode');
const pixLogger = require('../../utils/pixLogger');

const LOG_PREFIX = '[PIX:BB]';
const ENV_PIX_DEBUG = (process.env.PIX_DEBUG || '').toLowerCase() === 'true';
function dbg(config, message, data) {
  if (ENV_PIX_DEBUG || !!config?.pix_debug) {
    console.log(LOG_PREFIX, message, data || '');
    try { pixLogger.log('BB', message, data); } catch {}
  }
}

function ensureConfig(config) {
  const missing = [];
  if (!config?.pix_base_url) missing.push('pix_base_url');
  if (!config?.pix_client_id) missing.push('pix_client_id');
  if (!config?.pix_client_secret) missing.push('pix_client_secret');
  if (!config?.pix_chave) missing.push('pix_chave');
  if (missing.length) {
    const err = new Error('Config PIX Banco do Brasil incompleta: ' + missing.join(', '));
    err.status = 400;
    throw err;
  }
}

module.exports = {
  nome: 'BANCO_DO_BRASIL',

  async criarCobranca({ valor, descricao, config }) {
    ensureConfig(config);
    const httpsAgent = buildHttpsAgent(config);
    // BB costuma usar domínios separados para OAuth e API
    let oauthBase = config.pix_base_url;
    try {
      const u = new URL(config.pix_base_url);
      const isHm = /(^|\.)hm\./i.test(u.hostname);
      oauthBase = isHm ? 'https://oauth.hm.bb.com.br' : 'https://oauth.bb.com.br';
    } catch {}
    const token = await getOAuthToken({ baseUrl: oauthBase, clientId: config.pix_client_id, clientSecret: config.pix_client_secret, httpsAgent });
    const api = apiClient({ baseUrl: config.pix_base_url, token, httpsAgent });

    const body = {
      calendario: { expiracao: 600 },
      valor: { original: Number(valor).toFixed(2) },
      chave: config.pix_chave,
      solicitacaoPagador: descricao || 'Pagamento via PIX'
    };

    try {
      const res = await api.post(buildPixPath(config.pix_base_url, 'cob'), body);
  const data = res.data || {};
      const txid = data.txid || data.txId || data.loc?.txid || `BB${Date.now()}`;
  dbg(config, 'Cobrança criada', { txid, temLoc: !!data?.loc, base: config.pix_base_url });
      // Preferir payload EMV se já vier; senão, tentar via loc
      let copiaCola = data.pixCopiaECola || data.copiaCola || null;
      let qrBase64 = null;
  if (copiaCola) dbg(config, 'Payload copia-e-cola retornado diretamente', { txid });

      if (!copiaCola) {
        // Extrair locId em diferentes formatos
        let locId = data?.loc?.id || data?.loc?.idLocation || null;
        if (!locId && typeof data?.loc?.location === 'string') {
          const m = data.loc.location.match(/\/loc\/(\d+)/);
          if (m) locId = m[1];
        }
        if (!locId && txid) {
          try {
            const c = await api.get(buildPixPath(config.pix_base_url, `cob/${encodeURIComponent(txid)}`));
            const cd = c.data || {};
            locId = cd?.loc?.id || cd?.loc?.idLocation || locId;
            if (!locId && typeof cd?.loc?.location === 'string') {
              const m2 = cd.loc.location.match(/\/loc\/(\d+)/);
              if (m2) locId = m2[1];
            }
            if (locId) dbg(config, 'locId obtido via GET cob/txid', { txid, locId });
          } catch {}
        }
        if (locId) {
          try {
            const qrRes = await api.get(buildPixPath(config.pix_base_url, `loc/${encodeURIComponent(locId)}/qrcode`));
            const qd = qrRes.data || {};
            copiaCola = qd.qrcode || qd.emv || qd.texto || copiaCola;
            const img = qd.imagemQrcode || qd.imagemQRcode || null;
            if (img) {
              qrBase64 = String(img).startsWith('data:') ? img : `data:image/png;base64,${img}`;
            }
            dbg(config, 'QR obtido via loc/{id}/qrcode', { txid, temEMV: !!copiaCola, temImagem: !!qrBase64 });
          } catch {}
          if (!copiaCola && !qrBase64) {
            try {
              const qrAlt = await api.get(buildPixPath(config.pix_base_url, 'qrcode'), { params: { locId } });
              const qd2 = qrAlt.data || {};
              copiaCola = qd2.qrcode || qd2.emv || qd2.texto || copiaCola;
              const img2 = qd2.imagemQrcode || qd2.imagemQRcode || null;
              if (img2) {
                qrBase64 = String(img2).startsWith('data:') ? img2 : `data:image/png;base64,${img2}`;
              }
              dbg(config, 'QR obtido via qrcode?locId', { txid, temEMV: !!copiaCola, temImagem: !!qrBase64 });
            } catch {}
          }
        }
      }

      if (copiaCola && !qrBase64) {
  try { qrBase64 = await QRCode.toDataURL(copiaCola, { errorCorrectionLevel: 'M' }); dbg(config, 'QR gerado localmente a partir do EMV', { txid }); } catch {}
      }

      const expiracao = new Date(Date.now() + 10 * 60 * 1000);
  dbg(config, 'Resumo criação cobrança', { txid, temEMV: !!copiaCola, temQR: !!qrBase64, expiracao });

      return {
        txid,
        status: 'PENDENTE',
        valor: Number(valor).toFixed(2),
        copia_cola: copiaCola || null,
        qr_code_base64: qrBase64 || null,
        expiracao
      };
    } catch (err) {
  if (ENV_PIX_DEBUG || !!config?.pix_debug) { console.error(LOG_PREFIX, 'Erro ao criar cobrança', err.response?.status, err.response?.data || err.message); try { pixLogger.error('BB', 'Erro criar cobrança', { status: err.response?.status, data: err.response?.data || err.message }); } catch {} }
      const e = new Error(`Falha ao criar cobrança BB: ${err.response?.status || ''} ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      e.status = err.response?.status || 502;
      throw e;
    }
  },

  async consultarStatus({ txid, config }) {
    ensureConfig(config);
    const httpsAgent = buildHttpsAgent(config);
    let oauthBase = config.pix_base_url;
    try {
      const u = new URL(config.pix_base_url);
      const isHm = /(^|\.)hm\./i.test(u.hostname);
      oauthBase = isHm ? 'https://oauth.hm.bb.com.br' : 'https://oauth.bb.com.br';
    } catch {}
    const token = await getOAuthToken({ baseUrl: oauthBase, clientId: config.pix_client_id, clientSecret: config.pix_client_secret, httpsAgent });
    const api = apiClient({ baseUrl: config.pix_base_url, token, httpsAgent });
    try {
      const res = await api.get(buildPixPath(config.pix_base_url, `cob/${encodeURIComponent(txid)}`));
      const data = res.data || {};
      let status = 'PENDENTE';
      const raw = (data.status || '').toUpperCase();
      if (raw.includes('CONCLUID')) status = 'CONFIRMADO';
      else if (raw.includes('REMOVID')) status = 'CANCELADO';
  dbg(config, 'Consultar status', { txid, raw, normalizado: status });
      return { txid, status, valor: data?.valor?.original || null };
    } catch (err) {
  if (ENV_PIX_DEBUG || !!config?.pix_debug) { console.error(LOG_PREFIX, 'Erro consultar status', txid, err.response?.status, err.response?.data || err.message); try { pixLogger.error('BB', 'Erro consultar status', { txid, status: err.response?.status, data: err.response?.data || err.message }); } catch {} }
      const e = new Error(`Falha ao consultar cobrança BB: ${err.response?.status || ''} ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      e.status = err.response?.status || 502;
      throw e;
    }
  },

  async cancelarCobranca({ txid, config }) {
    ensureConfig(config);
    const httpsAgent = buildHttpsAgent(config);
    let oauthBase = config.pix_base_url;
    try {
      const u = new URL(config.pix_base_url);
      const isHm = /(^|\.)hm\./i.test(u.hostname);
      oauthBase = isHm ? 'https://oauth.hm.bb.com.br' : 'https://oauth.bb.com.br';
    } catch {}
    const token = await getOAuthToken({ baseUrl: oauthBase, clientId: config.pix_client_id, clientSecret: config.pix_client_secret, httpsAgent });
    const api = apiClient({ baseUrl: config.pix_base_url, token, httpsAgent });
    try {
      await api.patch(buildPixPath(config.pix_base_url, `cob/${encodeURIComponent(txid)}`), { status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' });
  dbg(config, 'Cobrança cancelada', { txid });
      return { txid, status: 'CANCELADO' };
    } catch (err) {
  if (ENV_PIX_DEBUG || !!config?.pix_debug) { console.error(LOG_PREFIX, 'Erro cancelar cobrança', txid, err.response?.status, err.response?.data || err.message); try { pixLogger.error('BB', 'Erro cancelar cobrança', { txid, status: err.response?.status, data: err.response?.data || err.message }); } catch {} }
      const e = new Error(`Falha ao cancelar cobrança BB: ${err.response?.status || ''} ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      e.status = err.response?.status || 502;
      throw e;
    }
  }
};
