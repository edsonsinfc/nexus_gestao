const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const csv = require('csv-parser');
const createReadStream = require('fs').createReadStream;

// Configurar upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'extratos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'extrato-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.ofx', '.csv', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato não suportado. Use OFX ou CSV'));
    }
  }
});

const ConciliacaoController = {
  upload,

  /**
   * Listar conciliações
   * @route GET /api/conciliacao-bancaria
   */
  async listar(req, res) {
    try {
      const { conta_bancaria_id, status } = req.query;

      let whereClause = '';
      const params = [];

      if (conta_bancaria_id) {
        whereClause = 'WHERE c.conta_bancaria_id = ?';
        params.push(conta_bancaria_id);
      }

      if (status) {
        whereClause += whereClause ? ' AND' : 'WHERE';
        whereClause += ' c.status = ?';
        params.push(status);
      }

      const [conciliacoes] = await db.query(`
        SELECT 
          c.*,
          cb.banco_nome,
          cb.agencia,
          cb.conta,
          u.nome as usuario_nome
        FROM conciliacoes_bancarias c
        JOIN contas_bancarias cb ON c.conta_bancaria_id = cb.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        ${whereClause}
        ORDER BY c.created_at DESC
      `, params);

      res.json({ conciliacoes });

    } catch (error) {
      console.error('Erro ao listar conciliações:', error);
      res.status(500).json({ error: 'Erro ao listar conciliações' });
    }
  },

  /**
   * Upload e processamento de extrato
   * @route POST /api/conciliacao-bancaria/upload-extrato
   */
  async uploadExtrato(req, res) {
    try {
      const { conta_bancaria_id } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      if (!conta_bancaria_id) {
        return res.status(400).json({ error: 'conta_bancaria_id obrigatório' });
      }

      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();

      let movimentos = [];

      if (ext === '.csv') {
        // Processar CSV (formato genérico: data, descricao, valor, tipo)
        movimentos = await new Promise((resolve, reject) => {
          const results = [];
          createReadStream(filePath)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
              try {
                const valor = parseFloat(data.valor || data.Valor || 0);
                const tipo = data.tipo || data.Tipo || (valor >= 0 ? 'CREDITO' : 'DEBITO');
                
                results.push({
                  data_extrato: data.data || data.Data,
                  descricao: data.descricao || data.Descricao || data.historico || data.Historico,
                  valor: Math.abs(valor),
                  tipo_movimento: tipo.toUpperCase(),
                  documento: data.documento || data.Documento || null
                });
              } catch (err) {
                console.error('Erro ao processar linha CSV:', err);
              }
            })
            .on('end', () => resolve(results))
            .on('error', reject);
        });
      } else {
        // OFX - implementação simplificada (pode usar lib 'banking' para produção)
        return res.status(501).json({ 
          error: 'Processamento OFX em desenvolvimento. Use CSV por enquanto.' 
        });
      }

      // Inserir movimentos no banco
      let inseridos = 0;
      let duplicados = 0;

      for (const mov of movimentos) {
        try {
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256')
            .update(`${conta_bancaria_id}-${mov.data_extrato}-${mov.valor}-${mov.descricao}`)
            .digest('hex');

          await db.query(`
            INSERT INTO extratos_bancarios (
              conta_bancaria_id, data_extrato, tipo_movimento, valor, 
              descricao, documento, arquivo_origem, hash_linha
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            conta_bancaria_id, mov.data_extrato, mov.tipo_movimento, mov.valor,
            mov.descricao, mov.documento, req.file.originalname, hash
          ]);
          inseridos++;
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            duplicados++;
          } else {
            console.error('Erro ao inserir movimento:', error);
          }
        }
      }

      res.json({
        message: 'Extrato processado com sucesso',
        total_movimentos: movimentos.length,
        inseridos,
        duplicados
      });

    } catch (error) {
      console.error('Erro ao processar extrato:', error);
      res.status(500).json({ error: 'Erro ao processar extrato' });
    }
  },

  /**
   * Iniciar conciliação com matching automático
   * @route POST /api/conciliacao-bancaria/iniciar
   */
  async iniciarConciliacao(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { conta_bancaria_id, periodo_inicio, periodo_fim } = req.body;
      const usuario_id = req.user.id;

      // Buscar lançamentos não conciliados
      const [lancamentos] = await connection.query(`
        SELECT * FROM lancamentos_financeiros
        WHERE conta_bancaria_id = ?
          AND data_pagamento BETWEEN ? AND ?
          AND status = 'PAGO'
          AND conciliado = FALSE
        ORDER BY data_pagamento, valor
      `, [conta_bancaria_id, periodo_inicio, periodo_fim]);

      // Buscar extratos não conciliados
      const [extratos] = await connection.query(`
        SELECT * FROM extratos_bancarios
        WHERE conta_bancaria_id = ?
          AND data_extrato BETWEEN ? AND ?
          AND conciliado = FALSE
        ORDER BY data_extrato, valor
      `, [conta_bancaria_id, periodo_inicio, periodo_fim]);

      // Criar conciliação
      const [conciliacaoResult] = await connection.query(`
        INSERT INTO conciliacoes_bancarias (
          conta_bancaria_id, periodo_inicio, periodo_fim,
          saldo_inicial, saldo_final, saldo_extrato, usuario_id
        ) VALUES (?, ?, ?, 0, 0, 0, ?)
      `, [conta_bancaria_id, periodo_inicio, periodo_fim, usuario_id]);

      const conciliacao_id = conciliacaoResult.insertId;

      // Matching automático (por valor e data próxima)
      let matchings = 0;

      for (const lanc of lancamentos) {
        const extrato = extratos.find(e => {
          const valorMatch = Math.abs(parseFloat(e.valor) - parseFloat(lanc.valor)) < 0.01;
          const tipoMatch = (lanc.tipo === 'RECEITA' && e.tipo_movimento === 'CREDITO') ||
                           (lanc.tipo === 'DESPESA' && e.tipo_movimento === 'DEBITO');
          
          // Data até 3 dias de diferença
          const diffDias = Math.abs(
            (new Date(e.data_extrato) - new Date(lanc.data_pagamento)) / (1000 * 60 * 60 * 24)
          );
          
          return valorMatch && tipoMatch && diffDias <= 3 && !e.conciliado;
        });

        if (extrato) {
          // Criar item de conciliação
          await connection.query(`
            INSERT INTO conciliacoes_itens (
              conciliacao_id, lancamento_id, extrato_id, tipo_matching
            ) VALUES (?, ?, ?, 'AUTOMATICO')
          `, [conciliacao_id, lanc.id, extrato.id]);

          // Marcar como conciliados
          await connection.query(
            'UPDATE lancamentos_financeiros SET conciliado = TRUE, conciliacao_id = ? WHERE id = ?',
            [conciliacao_id, lanc.id]
          );
          await connection.query(
            'UPDATE extratos_bancarios SET conciliado = TRUE, conciliacao_id = ? WHERE id = ?',
            [conciliacao_id, extrato.id]
          );

          extrato.conciliado = true; // Marcar localmente para não reutilizar
          matchings++;
        }
      }

      await connection.commit();

      res.json({
        message: 'Conciliação iniciada com sucesso',
        conciliacao_id,
        matchings_automaticos: matchings,
        total_lancamentos: lancamentos.length,
        total_extratos: extratos.length
      });

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao iniciar conciliação:', error);
      res.status(500).json({ error: 'Erro ao iniciar conciliação' });
    } finally {
      connection.release();
    }
  },

  /**
   * Matching manual
   * @route POST /api/conciliacao-bancaria/:id/matching
   */
  async matchingManual(req, res) {
    try {
      const { id: conciliacao_id } = req.params;
      const { lancamento_id, extrato_id } = req.body;

      await db.query(`
        INSERT INTO conciliacoes_itens (
          conciliacao_id, lancamento_id, extrato_id, tipo_matching
        ) VALUES (?, ?, ?, 'MANUAL')
      `, [conciliacao_id, lancamento_id, extrato_id]);

      // Marcar como conciliados
      await db.query(
        'UPDATE lancamentos_financeiros SET conciliado = TRUE, conciliacao_id = ? WHERE id = ?',
        [conciliacao_id, lancamento_id]
      );
      await db.query(
        'UPDATE extratos_bancarios SET conciliado = TRUE, conciliacao_id = ? WHERE id = ?',
        [conciliacao_id, extrato_id]
      );

      res.json({ message: 'Matching realizado com sucesso' });

    } catch (error) {
      console.error('Erro ao realizar matching:', error);
      res.status(500).json({ error: 'Erro ao realizar matching' });
    }
  },

  /**
   * Finalizar conciliação
   * @route POST /api/conciliacao-bancaria/:id/finalizar
   */
  async finalizar(req, res) {
    try {
      const { id } = req.params;

      // Contar itens conciliados
      const [stats] = await db.query(`
        SELECT 
          COUNT(DISTINCT lancamento_id) as total_lancamentos,
          COUNT(DISTINCT extrato_id) as total_extratos
        FROM conciliacoes_itens
        WHERE conciliacao_id = ?
      `, [id]);

      await db.query(`
        UPDATE conciliacoes_bancarias
        SET status = 'CONCLUIDA',
            data_conciliacao = NOW(),
            total_lancamentos_conciliados = ?,
            total_extrato_conciliado = ?
        WHERE id = ?
      `, [stats[0].total_lancamentos, stats[0].total_extratos, id]);

      res.json({ message: 'Conciliação finalizada com sucesso' });

    } catch (error) {
      console.error('Erro ao finalizar conciliação:', error);
      res.status(500).json({ error: 'Erro ao finalizar conciliação' });
    }
  }
};

module.exports = ConciliacaoController;
