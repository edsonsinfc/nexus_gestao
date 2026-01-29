// integrations/pix/http.js
// Utilitários HTTP com mTLS e OAuth2 para provedores PIX

const fs = require('fs');
const https = require('https');
const axios = require('axios');

function buildHttpsAgent(config) {
  // Prioriza PFX/P12; alternativamente usa PEM cert/key/ca
  const opts = {};
  if (config.pix_cert_pfx_path) {
    try { opts.pfx = fs.readFileSync(config.pix_cert_pfx_path); } catch (e) {}
    if (config.pix_cert_pfx_password) opts.passphrase = config.pix_cert_pfx_password;
  } else {
    if (config.pix_cert_cert_path) {
      try { opts.cert = fs.readFileSync(config.pix_cert_cert_path); } catch (e) {}
    }
    if (config.pix_cert_key_path) {
      try { opts.key = fs.readFileSync(config.pix_cert_key_path); } catch (e) {}
    }
    if (config.pix_cert_ca_path) {
      try { opts.ca = fs.readFileSync(config.pix_cert_ca_path); } catch (e) {}
    }
  }
  // Segurança: rejeitar conexões sem certificados válidos
  opts.rejectUnauthorized = true;
  return new https.Agent(opts);
}

async function getOAuthToken({ baseUrl, clientId, clientSecret, httpsAgent }) {
  // Convenção: endpoint de token padronizado
  const tokenUrl = baseUrl.replace(/\/$/, '') + '/oauth/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  try {
    const res = await axios.post(tokenUrl, params.toString(), {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      timeout: 15000
    });
    if (!res.data || !res.data.access_token) {
      const err = new Error('Token OAuth inválido: resposta sem access_token');
      err.status = 502;
      throw err;
    }
    return res.data.access_token;
  } catch (err) {
    const e = new Error(`Falha ao obter token OAuth: ${err.response?.status || ''} ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    e.status = err.response?.status || 500;
    throw e;
  }
}

function apiClient({ baseUrl, token, httpsAgent }) {
  const instance = axios.create({
    baseURL: baseUrl.replace(/\/$/, ''),
    httpsAgent,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 20000
  });
  return instance;
}

module.exports = { buildHttpsAgent, getOAuthToken, apiClient };
/**
 * Monta o caminho do recurso PIX considerando se a base já contém "/pix" (ou "/pix/vX").
 * Ex.: base = https://api.bb.com.br/pix/v1 -> buildPixPath(base,'cob') => '/cob'
 *      base = https://api.exemplo.com -> buildPixPath(base,'cob') => '/pix/cob'
 */
function buildPixPath(baseUrl, resource) {
  try {
    const hasPix = /\/pix(\/|$)/i.test((baseUrl || ''));
    const res = String(resource || '').replace(/^\/+/, '');
    return hasPix ? `/${res}` : `/pix/${res}`;
  } catch {
    const res = String(resource || '').replace(/^\/+/, '');
    return `/pix/${res}`;
  }
}

module.exports.buildPixPath = buildPixPath;
