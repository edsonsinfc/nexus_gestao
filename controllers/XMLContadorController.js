const db = require('../db');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

const XMLContadorController = {
  /**
   * Listar XMLs disponíveis por período
   * @route GET /api/xml-contador/preview
   */
  async previewXMLs(req, res) {
    try {
      const { data_inicio, data_fim } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Período obrigatório' });
      }

      // Buscar NFC-e
      let nfces = [];
      try {
        const resultado = await db.query(`
          SELECT 
            id, numero_nfce as numero, serie, chave_acesso, data_emissao,
            valor_total, cfop_predominante as cfop, 'NFCE' as tipo,
            xml_nfce_path as xml_path
          FROM nfce
          WHERE data_emissao BETWEEN ? AND ?
            AND status_nfce = 'AUTORIZADA'
          ORDER BY data_emissao
        `, [data_inicio, data_fim]);
        nfces = resultado[0] || [];
      } catch (err) {
        console.log('⚠️ Erro ao buscar NFC-e:', err.message);
      }

      // Buscar NF-e de saída (assumindo que existe tabela nfe_saida)
      let nfes = [];
      try {
        const resultado = await db.query(`
          SELECT 
            id, numero_nfe as numero, serie, chave_acesso, data_emissao,
            valor_total_nfe as valor_total, cfop_predominante as cfop, 'NFE' as tipo,
            xml_path
          FROM nfe_saida
          WHERE data_emissao BETWEEN ? AND ?
            AND status = 'AUTORIZADA'
          ORDER BY data_emissao
        `, [data_inicio, data_fim]);
        nfes = resultado[0] || [];
      } catch (err) {
        console.log('⚠️ Tabela nfe_saida não existe ou erro:', err.message);
      }

      const xmls = [...nfces, ...nfes];

      // Estatísticas
      const stats = {
        total_nfce: nfces.length,
        total_nfe: nfes.length,
        valor_total_nfce: nfces.reduce((sum, n) => sum + parseFloat(n.valor_total || 0), 0),
        valor_total_nfe: nfes.reduce((sum, n) => sum + parseFloat(n.valor_total || 0), 0)
      };

      res.json({ xmls, stats });

    } catch (error) {
      console.error('❌ Erro ao buscar XMLs:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        error: 'Erro ao buscar XMLs',
        detalhes: error.message
      });
    }
  },

  /**
   * Gerar ZIP e enviar para contador
   * @route POST /api/xml-contador/enviar
   */
  async enviarParaContador(req, res) {
    try {
      const { data_inicio, data_fim, email_contador, email_copia } = req.body;
      const usuario_id = req.user.id;

      if (!data_inicio || !data_fim || !email_contador) {
        return res.status(400).json({ error: 'Período e email do contador obrigatórios' });
      }

      // Buscar XMLs NFC-e
      let nfces = [];
      try {
        const resultado = await db.query(`
          SELECT id, numero_nfce, serie, chave_acesso, data_emissao, valor_total, 
                 cfop_predominante, xml_nfce_path, xml_nfce
          FROM nfce
          WHERE data_emissao BETWEEN ? AND ?
            AND status_nfce = 'AUTORIZADA'
        `, [data_inicio, data_fim]);
        nfces = resultado[0] || [];
      } catch (err) {
        console.log('⚠️ Erro ao buscar NFC-e para envio:', err.message);
      }

      // Buscar XMLs NF-e
      let nfes = [];
      try {
        const resultado = await db.query(`
          SELECT id, numero_nfe, serie, chave_acesso, data_emissao, 
                 valor_total_nfe as valor_total, cfop_predominante, xml_path, xml_conteudo
          FROM nfe_saida
          WHERE data_emissao BETWEEN ? AND ?
            AND status = 'AUTORIZADA'
        `, [data_inicio, data_fim]);
        nfes = resultado[0] || [];
      } catch (err) {
        console.log('⚠️ Tabela nfe_saida não existe ou erro:', err.message);
      }

      if (nfces.length === 0 && nfes.length === 0) {
        return res.status(404).json({ error: 'Nenhum XML encontrado para o período' });
      }

      // Criar registro de envio
      const [envioResult] = await db.query(`
        INSERT INTO xml_envios_contador (
          periodo_inicio, periodo_fim, email_contador, email_copia,
          quantidade_nfce, quantidade_nfe, status, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'PROCESSANDO', ?)
      `, [data_inicio, data_fim, email_contador, email_copia || null, nfces.length, nfes.length, usuario_id]);

      const envio_id = envioResult.insertId;

      // Criar diretório temp
      const tempDir = path.join(__dirname, '..', 'uploads', 'xml-temp', `envio-${envio_id}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Criar ZIP
      const zipPath = path.join(__dirname, '..', 'uploads', 'xml-contador', `xmls-${envio_id}.zip`);
      await fs.mkdir(path.dirname(zipPath), { recursive: true });

      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', async () => {
        try {
          // Atualizar tamanho do arquivo
          const stats = await fs.stat(zipPath);
          
          await db.query(`
            UPDATE xml_envios_contador
            SET tamanho_arquivo_bytes = ?,
                arquivo_zip_path = ?
            WHERE id = ?
          `, [stats.size, zipPath, envio_id]);

          // Enviar email
          await this.enviarEmail(email_contador, email_copia, zipPath, {
            periodo_inicio: data_inicio,
            periodo_fim: data_fim,
            quantidade_nfce: nfces.length,
            quantidade_nfe: nfes.length
          });

          // Marcar como enviado
          await db.query(`
            UPDATE xml_envios_contador
            SET status = 'ENVIADO',
                data_envio = NOW()
            WHERE id = ?
          `, [envio_id]);

          // Limpar arquivos temporários
          await fs.rm(tempDir, { recursive: true, force: true });

        } catch (error) {
          console.error('Erro ao finalizar envio:', error);
          await db.query(`
            UPDATE xml_envios_contador
            SET status = 'ERRO',
                erro_mensagem = ?
            WHERE id = ?
          `, [error.message, envio_id]);
        }
      });

      archive.on('error', async (err) => {
        console.error('Erro ao criar ZIP:', err);
        await db.query(`
          UPDATE xml_envios_contador
          SET status = 'ERRO',
              erro_mensagem = ?
          WHERE id = ?
        `, [err.message, envio_id]);
      });

      archive.pipe(output);

      // Adicionar NFC-es ao ZIP
      for (const nfce of nfces) {
        const xmlContent = nfce.xml_nfce || '';
        if (xmlContent) {
          const fileName = `NFCE/${nfce.chave_acesso || nfce.numero_nfce}.xml`;
          archive.append(xmlContent, { name: fileName });

          // Registrar detalhe
          await db.query(`
            INSERT INTO xml_envios_detalhes (
              envio_id, tipo_documento, documento_id, numero_documento, serie,
              chave_acesso, data_emissao, valor_total, cfop, arquivo_xml_nome
            ) VALUES (?, 'NFCE', ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            envio_id, nfce.id, nfce.numero_nfce, nfce.serie, nfce.chave_acesso,
            nfce.data_emissao, nfce.valor_total, nfce.cfop_predominante, fileName
          ]);
        }
      }

      // Adicionar NF-es ao ZIP
      for (const nfe of nfes) {
        const xmlContent = nfe.xml_content || '';
        if (xmlContent) {
          const fileName = `NFE/${nfe.chave_acesso || nfe.numero_nfe}.xml`;
          archive.append(xmlContent, { name: fileName });

          await db.query(`
            INSERT INTO xml_envios_detalhes (
              envio_id, tipo_documento, documento_id, numero_documento, serie,
              chave_acesso, data_emissao, valor_total, cfop, arquivo_xml_nome
            ) VALUES (?, 'NFE', ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            envio_id, nfe.id, nfe.numero_nfe, nfe.serie, nfe.chave_acesso,
            nfe.data_emissao, nfe.valor_total_nfe, nfe.cfop_predominante, fileName
          ]);
        }
      }

      await archive.finalize();

      res.json({
        message: 'Processamento iniciado. Email será enviado em breve.',
        envio_id
      });

    } catch (error) {
      console.error('Erro ao enviar XMLs:', error);
      res.status(500).json({ error: 'Erro ao enviar XMLs para contador' });
    }
  },

  /**
   * Enviar email com anexo
   */
  async enviarEmail(emailContador, emailCopia, zipPath, info) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: emailContador,
      cc: emailCopia || undefined,
      subject: `XMLs Fiscais - Período ${info.periodo_inicio} a ${info.periodo_fim}`,
      html: `
        <h2>Envio de XMLs Fiscais</h2>
        <p>Segue em anexo os XMLs das notas fiscais emitidas no período.</p>
        <ul>
          <li><strong>Período:</strong> ${info.periodo_inicio} a ${info.periodo_fim}</li>
          <li><strong>NFC-e:</strong> ${info.quantidade_nfce} nota(s)</li>
          <li><strong>NF-e:</strong> ${info.quantidade_nfe} nota(s)</li>
          <li><strong>Total:</strong> ${info.quantidade_nfce + info.quantidade_nfe} nota(s)</li>
        </ul>
        <p>Arquivos organizados em pastas: NFCE/ e NFE/</p>
        <p><small>Email gerado automaticamente pelo sistema Nexus Gestão</small></p>
      `,
      attachments: [
        {
          filename: path.basename(zipPath),
          path: zipPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
  },

  /**
   * Histórico de envios
   * @route GET /api/xml-contador/historico
   */
  async historico(req, res) {
    try {
      const [envios] = await db.query(`
        SELECT 
          e.*,
          u.nome as usuario_nome
        FROM xml_envios_contador e
        LEFT JOIN usuarios u ON e.usuario_id = u.id
        ORDER BY e.created_at DESC
        LIMIT 50
      `);

      res.json({ envios });

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  },

  /**
   * Detalhes de um envio
   * @route GET /api/xml-contador/:id
   */
  async detalhes(req, res) {
    try {
      const { id } = req.params;

      const [envios] = await db.query(
        'SELECT * FROM xml_envios_contador WHERE id = ?',
        [id]
      );

      if (envios.length === 0) {
        return res.status(404).json({ error: 'Envio não encontrado' });
      }

      const [detalhes] = await db.query(
        'SELECT * FROM xml_envios_detalhes WHERE envio_id = ? ORDER BY tipo_documento, numero_documento',
        [id]
      );

      res.json({
        envio: envios[0],
        detalhes
      });

    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do envio' });
    }
  }
};

module.exports = XMLContadorController;
