// utils/pixLogger.js
// Buffer de logs de debug do PIX para consulta via Admin

const MAX_LOGS = 1000;
const buffer = [];

function add(level, tag, message, data) {
  const entry = {
    ts: new Date().toISOString(),
    level: String(level || 'info').toLowerCase(),
    tag: String(tag || 'PIX'),
    message: String(message || ''),
    data: data !== undefined ? safeData(data) : undefined,
  };
  buffer.push(entry);
  if (buffer.length > MAX_LOGS) buffer.splice(0, buffer.length - MAX_LOGS);
}

function safeData(d) {
  try {
    // Evitar vazamento de segredos inadvertidos; mascarar campos sensíveis
    if (d && typeof d === 'object') {
      const clone = JSON.parse(JSON.stringify(d));
      const maskKeys = ['client_secret','pix_client_secret','pix_cert_pfx_password','senha'];
      Object.keys(clone).forEach(k => {
        if (maskKeys.includes(k)) clone[k] = '***';
      });
      return clone;
    }
  } catch {}
  return d;
}

module.exports = {
  log(tag, message, data) { add('info', tag, message, data); },
  warn(tag, message, data) { add('warn', tag, message, data); },
  error(tag, message, data) { add('error', tag, message, data); },
  getLatest(limit = 200, tag = null) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 1000);
    if (tag && tag !== 'ALL') {
      const t = String(tag);
      return buffer.filter(e => e.tag === t).slice(-lim);
    }
    return buffer.slice(-lim);
  },
  clear() { buffer.length = 0; }
};
