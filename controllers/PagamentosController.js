// controllers/PagamentosController.js
const pool = require('../src/config/db');
const QRCode = require('qrcode');
const { getPixProvider } = require('../integrations/pix');
const pixLogger = require('../utils/pixLogger');

// Estados possíveis da cobrança PIX
const PIX_STATUS = {
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  CANCELADO: 'CANCELADO',
  EXPIRADO: 'EXPIRADO'
};

class PagamentosController {
  // Webhook PIX: atualiza status baseado nas notificações do PSP
  static async webhookPIX(req, res) {
    try {
      // Validação por token secreto (Authorization: Bearer <token> ou x-webhook-token)
      const provided = (req.headers['authorization'] || '').startsWith('Bearer ')
        ? (req.headers['authorization'] || '').slice(7).trim()
        : (req.headers['x-webhook-token'] || req.headers['x-pix-token'] || '').toString();

      const [cfgRows] = await pool.query('SELECT pix_webhook_token, pix_ambiente FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      const expected = cfgRows && cfgRows[0] ? (cfgRows[0].pix_webhook_token || '') : '';
      const ambiente = cfgRows && cfgRows[0] ? (cfgRows[0].pix_ambiente || 'HOMOLOGACAO') : 'HOMOLOGACAO';
      const relaxEnv = (process.env.PIX_WEBHOOK_ALLOW_NO_TOKEN || '').toLowerCase() === 'true';
      const allowNoToken = relaxEnv && ambiente === 'HOMOLOGACAO';
      if ((!expected || !provided || provided !== expected) && !allowNoToken) {
        return res.status(401).json({ error: 'Token inválido' });
      }
      if (allowNoToken && (!provided || provided !== expected)) {
        console.warn('⚠️ Webhook PIX aceito sem validação de token (modo HOMOLOGACAO + PIX_WEBHOOK_ALLOW_NO_TOKEN=true).');
      }

      const payload = req.body || {};
      const [cfgDbg] = await pool.query('SELECT pix_debug FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      const DEBUG = ((process.env.PIX_DEBUG || '').toLowerCase() === 'true') || !!(cfgDbg && cfgDbg[0] && cfgDbg[0].pix_debug);
      const eventos = Array.isArray(payload.pix) ? payload.pix : (payload.txid ? [payload] : []);
      if (!eventos.length) {
        if (DEBUG) console.log('[PIX] Webhook recebido sem eventos válidos');
        return res.status(200).json({ message: 'OK (sem eventos)' });
      }

      let atualizados = 0;
      const txids = [];
      for (const evt of eventos) {
        const txid = evt.txid || evt.txId || null;
        if (!txid) continue;
        txids.push(txid);
        const [rows] = await pool.query('SELECT id, status FROM pagamentos_pix WHERE txid = ? LIMIT 1', [txid]);
        if (!rows || rows.length === 0) continue;
        const row = rows[0];
        if (row.status !== PIX_STATUS.CONFIRMADO) {
          await pool.query('UPDATE pagamentos_pix SET status = ?, data_confirmacao = NOW(), updated_at = NOW() WHERE id = ?', [PIX_STATUS.CONFIRMADO, row.id]);
          atualizados += 1;
        }
      }
      if (DEBUG) console.log('[PIX] Webhook processado', { eventos: eventos.length, atualizados, txids });

      return res.status(200).json({ message: 'OK', atualizados });
    } catch (error) {
      console.error('❌ Webhook PIX erro:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // Cria uma cobrança PIX simulada e retorna QR Code (base64) e copia-e-cola
  static async criarCobrancaPIX(req, res) {
    try {
      const { valor, descricao } = req.body || {};
      if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        return res.status(400).json({ error: 'Valor inválido para cobrança PIX.' });
      }

      // Carrega provedor configurado
  const [cfgRows] = await pool.query("SELECT pix_provider, pix_ambiente, pix_base_url, pix_client_id, pix_client_secret, pix_webhook_url, pix_webhook_token, pix_debug, pix_ispb, pix_agencia, pix_conta, pix_tipo_conta, pix_chave, pix_cert_pfx_path, pix_cert_pfx_password, pix_cert_cert_path, pix_cert_key_path, pix_cert_ca_path FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1");
  const cfg = cfgRows && cfgRows[0] ? cfgRows[0] : {};
      const providerName = (cfg.pix_provider || 'SIMULADO').toUpperCase();
      const provider = getPixProvider(providerName);
  const DEBUG = ((process.env.PIX_DEBUG || '').toLowerCase() === 'true') || !!cfg.pix_debug;
  if (DEBUG) console.log('[PIX] Roteando criar cobrança', { provider: providerName, valor: parseFloat(valor).toFixed(2) });

      if (provider) {
        try {
          // Roteia para provedor real
          const resultado = await provider.criarCobranca({ valor: parseFloat(valor), descricao, config: cfg });
          if (DEBUG) console.log('[PIX] Resultado provedor', { provider: providerName, txid: resultado.txid, temEMV: !!resultado.copia_cola, temQR: !!resultado.qr_code_base64 });
          // Persiste localmente para acompanhamento
          const [ins] = await pool.query(
            `INSERT INTO pagamentos_pix (txid, valor, status, copia_cola, qr_code_base64, expiracao, descricao)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [resultado.txid, parseFloat(resultado.valor).toFixed(2), resultado.status || PIX_STATUS.PENDENTE, resultado.copia_cola || null, resultado.qr_code_base64 || null, resultado.expiracao || null, descricao || null]
          );
          return res.status(201).json({ id: ins.insertId, ...resultado });
        } catch (err) {
          if (DEBUG) console.error('[PIX] Erro provedor criarCobranca', providerName, err.message);
          const status = err.status || 500;
          return res.status(status).json({ error: err.message || 'Falha no provedor PIX' });
        }
      }

      const valorNum = parseFloat(valor).toFixed(2);
      const txid = `PIX${Date.now()}${Math.floor(Math.random() * 1000)}`;
      // Para ambiente real, aqui montaria payload EMVCo completo. Para demo, usamos um conteúdo simples.
      const copiaCola = `PIX:${txid}:${valorNum}`;

      // Gera QR code base64
      const qrCodeDataUrl = await QRCode.toDataURL(copiaCola, { errorCorrectionLevel: 'M' });

      // Expira em 10 minutos
      const expiracao = new Date(Date.now() + 10 * 60 * 1000);

      const [result] = await pool.query(
        `INSERT INTO pagamentos_pix (txid, valor, status, copia_cola, qr_code_base64, expiracao, descricao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [txid, valorNum, PIX_STATUS.PENDENTE, copiaCola, qrCodeDataUrl, expiracao, descricao || null]
      );
  if (((process.env.PIX_DEBUG || '').toLowerCase() === 'true')) console.log('[PIX] SIMULADO criado', { txid, valor: valorNum });

      return res.status(201).json({
        id: result.insertId,
        txid,
        status: PIX_STATUS.PENDENTE,
        valor: valorNum,
        copia_cola: copiaCola,
        qr_code_base64: qrCodeDataUrl,
        expiracao
      });
    } catch (error) {
      console.error('❌ Erro ao criar cobrança PIX:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Consulta status da cobrança
  static async statusPIX(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM pagamentos_pix WHERE id = ?', [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Cobrança PIX não encontrada' });
      }
      const cobranca = rows[0];

      // Se houver provedor real configurado, tenta consultar status por txid e sincroniza
  const [cfgRows] = await pool.query("SELECT pix_provider, pix_debug, pix_base_url, pix_client_id, pix_client_secret, pix_cert_pfx_path, pix_cert_pfx_password, pix_cert_cert_path, pix_cert_key_path, pix_cert_ca_path FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1");
      const cfg = cfgRows && cfgRows[0] ? cfgRows[0] : {};
      const provider = getPixProvider((cfg.pix_provider || 'SIMULADO').toUpperCase());
      const DEBUG = ((process.env.PIX_DEBUG || '').toLowerCase() === 'true') || !!cfg.pix_debug;
      if (provider && cobranca?.txid) {
        try {
          const st = await provider.consultarStatus({ txid: cobranca.txid, config: cfg });
          if (DEBUG) console.log('[PIX] Status provedor', { txid: cobranca.txid, status: st?.status });
          if (st && st.status && st.status !== cobranca.status) {
            await pool.query('UPDATE pagamentos_pix SET status = ?, updated_at = NOW() WHERE id = ?', [st.status, id]);
            cobranca.status = st.status;
          }
        } catch (e) {
          // Silencioso: mantém status local
          if (DEBUG) console.warn('[PIX] Falha ao consultar provedor, mantendo status local', { txid: cobranca.txid, erro: e.message });
        }
      }

      // Caso no futuro a cobrança seja criada via provedor real, poderíamos consultar o provedor aqui usando o txid
      // Por ora, mantemos a tabela local como fonte da verdade

      // Atualiza para EXPIRADO se passou da expiração e ainda pendente
      if (cobranca.status === PIX_STATUS.PENDENTE && cobranca.expiracao && new Date(cobranca.expiracao) < new Date()) {
        await pool.query('UPDATE pagamentos_pix SET status = ?, updated_at = NOW() WHERE id = ?', [PIX_STATUS.EXPIRADO, id]);
  if (((process.env.PIX_DEBUG || '').toLowerCase() === 'true') || !!cfg.pix_debug) console.log('[PIX] Cobrança expirada', { id, txid: cobranca.txid });
        cobranca.status = PIX_STATUS.EXPIRADO;
      }

      return res.json({
        id: cobranca.id,
        txid: cobranca.txid,
        status: cobranca.status,
        valor: cobranca.valor,
        expiracao: cobranca.expiracao
      });
    } catch (error) {
      console.error('❌ Erro ao consultar status PIX:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Cancela cobrança manualmente
  static async cancelarPIX(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM pagamentos_pix WHERE id = ?', [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Cobrança PIX não encontrada' });
      }
      const cobranca = rows[0];
      if (cobranca.status !== PIX_STATUS.PENDENTE) {
        return res.status(400).json({ error: 'A cobrança não está pendente e não pode ser cancelada.' });
      }
      // Se criada no provedor, tenta cancelar
  const [cfgRows] = await pool.query("SELECT pix_provider, pix_debug, pix_base_url, pix_client_id, pix_client_secret, pix_cert_pfx_path, pix_cert_pfx_password, pix_cert_cert_path, pix_cert_key_path, pix_cert_ca_path FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1");
      const cfg = cfgRows && cfgRows[0] ? cfgRows[0] : {};
      const provider = getPixProvider((cfg.pix_provider || 'SIMULADO').toUpperCase());
      if (provider && cobranca?.txid) {
        try { await provider.cancelarCobranca({ txid: cobranca.txid, config: cfg }); } catch (e) { /* ignora erro remoto */ }
      }
      await pool.query('UPDATE pagamentos_pix SET status = ?, updated_at = NOW() WHERE id = ?', [PIX_STATUS.CANCELADO, id]);
      return res.json({ message: 'Cobrança PIX cancelada.' });
    } catch (error) {
      console.error('❌ Erro ao cancelar PIX:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Endpoint de simulação para marcar como pago (útil em testes)
  static async simularPago(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM pagamentos_pix WHERE id = ?', [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Cobrança PIX não encontrada' });
      }
      const cobranca = rows[0];
      if (cobranca.status !== PIX_STATUS.PENDENTE) {
        return res.status(400).json({ error: 'Cobrança não está pendente.' });
      }
      await pool.query('UPDATE pagamentos_pix SET status = ?, data_confirmacao = NOW(), updated_at = NOW() WHERE id = ?', [PIX_STATUS.CONFIRMADO, id]);
      return res.json({ message: 'Pagamento PIX confirmado (simulado).', status: PIX_STATUS.CONFIRMADO });
    } catch (error) {
      console.error('❌ Erro ao simular pagamento PIX:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Logs de debug do PIX (somente admin/configuracoes)
  static async getPixLogs(req, res) {
    try {
      const { limit = 200, tag = 'ALL' } = req.query;
      const logs = pixLogger.getLatest(limit, tag);
      return res.json({ logs });
    } catch (error) {
      console.error('❌ Erro ao obter logs PIX:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async clearPixLogs(req, res) {
    try {
      pixLogger.clear();
      return res.json({ message: 'Logs PIX limpos.' });
    } catch (error) {
      console.error('❌ Erro ao limpar logs PIX:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = PagamentosController;
