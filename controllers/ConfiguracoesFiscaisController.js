const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

class ConfiguracoesFiscaisController {
  static async getAtiva(req, res) {
    try {
  const [rows] = await pool.execute('SELECT id, cnpj, inscricao_estadual, razao_social, nome_fantasia, logradouro, numero, complemento, bairro, municipio, uf, cep, codigo_municipio, telefone, email, regime_tributario, codigo_regime_tributario, ambiente_nfce, serie_nfce, proximo_numero, /* não enviar binários */ NULL as certificado_a1, NULL as logo, observacoes_padrao, informacoes_complementares, csc_id, csc_token, pix_provider, pix_ambiente, pix_base_url, pix_client_id, pix_client_secret, pix_webhook_url, pix_webhook_token, pix_debug, pix_ispb, pix_agencia, pix_conta, pix_tipo_conta, pix_chave, pix_cert_pfx_path, pix_cert_pfx_password, pix_cert_cert_path, pix_cert_key_path, pix_cert_ca_path FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const cfg = rows[0];
      const allowBypass = (process.env.PIX_WEBHOOK_ALLOW_NO_TOKEN || '').toLowerCase() === 'true';
      const pix_webhook_bypass_ativo = allowBypass && cfg.pix_ambiente === 'HOMOLOGACAO';
      // Não vazar segredos para o frontend
      const response = { ...cfg, pix_webhook_bypass_ativo };
      // Flags de presença
      response.pix_client_secret_set = !!cfg.pix_client_secret;
      response.pix_cert_pfx_password_set = !!cfg.pix_cert_pfx_password;
      // Remover valores sensíveis da resposta
      response.pix_client_secret = null;
      response.pix_cert_pfx_password = null;
      res.json(response);
    } catch (err) {
      console.error('Erro ao buscar config fiscal:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async updateCampos(req, res) {
    try {
  const allowed = ['cnpj','inscricao_estadual','razao_social','nome_fantasia','logradouro','numero','complemento','bairro','municipio','uf','cep','codigo_municipio','telefone','email','regime_tributario','codigo_regime_tributario','ambiente_nfce','serie_nfce','proximo_numero','observacoes_padrao','informacoes_complementares','csc_id','csc_token','pix_provider','pix_ambiente','pix_base_url','pix_client_id','pix_client_secret','pix_webhook_url','pix_webhook_token','pix_debug','pix_ispb','pix_agencia','pix_conta','pix_tipo_conta','pix_chave','pix_cert_pfx_path','pix_cert_pfx_password','pix_cert_cert_path','pix_cert_key_path','pix_cert_ca_path'];
      const data = req.body || {};
      // Normalizar pix_base_url para evitar duplicação de "/pix" nos conectores
      if (typeof data.pix_base_url === 'string') {
        let u = data.pix_base_url.trim();
        // remove barras finais
        u = u.replace(/\/+$/,'');
  // remove sufixos /pix ou /pix/ (mantém versões como /pix/v1)
  u = u.replace(/\/pix\/?$/i, '');
        data.pix_base_url = u;
      }
      // Se provider for BB e base não vier informada, preencher padrão de acordo com o ambiente
      try {
        if (data.pix_provider && String(data.pix_provider).toUpperCase() === 'BANCO_DO_BRASIL' && (!data.pix_base_url || String(data.pix_base_url).trim() === '')) {
          const [rowsAmb] = await pool.execute('SELECT pix_ambiente FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
          const ambienteAtual = rowsAmb && rowsAmb[0] ? (rowsAmb[0].pix_ambiente || 'HOMOLOGACAO') : 'HOMOLOGACAO';
          const amb = (data.pix_ambiente || ambienteAtual || 'HOMOLOGACAO').toUpperCase();
          data.pix_base_url = amb === 'HOMOLOGACAO' ? 'https://api.hm.bb.com.br/pix/v1' : 'https://api.bb.com.br/pix/v1';
        }
        if (data.pix_provider && String(data.pix_provider).toUpperCase() === 'SICOOB' && (!data.pix_base_url || String(data.pix_base_url).trim() === '')) {
          // Base raiz; o conector acrescenta "/pix/..." conforme necessário
          data.pix_base_url = 'https://api.sicoob.com.br';
        }
      } catch {}
      const fields = Object.keys(data).filter(k => allowed.includes(k));
      if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo válido enviado' });

      const [rows] = await pool.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const id = rows[0].id;

      const sets = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => data[f]);
      values.push(id);

      await pool.execute(`UPDATE configuracoes_fiscais SET ${sets}, updated_at = NOW() WHERE id = ?`, values);
      res.json({ message: 'Configurações atualizadas com sucesso' });
    } catch (err) {
      console.error('Erro ao atualizar campos fiscais:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async uploadLogo(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Arquivo de logo não enviado' });
      const buffer = req.file.buffer;
      const [rows] = await pool.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const id = rows[0].id;
      await pool.execute('UPDATE configuracoes_fiscais SET logo = ?, updated_at = NOW() WHERE id = ?', [buffer, id]);
      res.json({ message: 'Logo atualizada com sucesso' });
    } catch (err) {
      console.error('Erro ao enviar logo:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async removerLogo(req, res) {
    try {
      const [rows] = await pool.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const id = rows[0].id;
      await pool.execute('UPDATE configuracoes_fiscais SET logo = NULL, updated_at = NOW() WHERE id = ?', [id]);
      res.json({ message: 'Logo removida' });
    } catch (err) {
      console.error('Erro ao remover logo:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async uploadCertificado(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Arquivo de certificado (.pfx) não enviado' });
      const buffer = req.file.buffer;
      const senha = req.body?.senha || null;
      if (!senha) return res.status(400).json({ error: 'Senha do certificado é obrigatória' });
      const [rows] = await pool.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const id = rows[0].id;
      await pool.execute('UPDATE configuracoes_fiscais SET certificado_a1 = ?, senha_certificado = ?, updated_at = NOW() WHERE id = ?', [buffer, senha, id]);
      res.json({ message: 'Certificado A1 atualizado com sucesso' });
    } catch (err) {
      console.error('Erro ao enviar certificado:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async removerCertificado(req, res) {
    try {
      const [rows] = await pool.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const id = rows[0].id;
      await pool.execute('UPDATE configuracoes_fiscais SET certificado_a1 = NULL, senha_certificado = NULL, updated_at = NOW() WHERE id = ?', [id]);
      res.json({ message: 'Certificado removido' });
    } catch (err) {
      console.error('Erro ao remover certificado:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async removerWebhookToken(req, res) {
    try {
      const confirmPassword = req.body?.confirm_password || req.body?.senha || null;
      if (!confirmPassword) return res.status(400).json({ error: 'Senha obrigatória para confirmar a remoção do token.' });
      if (!req.user || !req.user.senha) return res.status(401).json({ error: 'Usuário não autenticado.' });
      const ok = await bcrypt.compare(confirmPassword, req.user.senha);
      if (!ok) return res.status(401).json({ error: 'Senha incorreta.' });

      const [rows] = await pool.execute('SELECT id FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'Configurações fiscais não encontradas' });
      const id = rows[0].id;
      await pool.execute('UPDATE configuracoes_fiscais SET pix_webhook_token = NULL, updated_at = NOW() WHERE id = ?', [id]);
      res.json({ message: 'Webhook token removido' });
    } catch (err) {
      console.error('Erro ao remover webhook token:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = ConfiguracoesFiscaisController;
