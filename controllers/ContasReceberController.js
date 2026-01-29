const pool = require('../db');

class ContasReceberController {
  // ========================================
  // LISTAGEM E FILTROS
  // ========================================
  
  /**
   * Listar contas a receber com filtros avançados
   */
  async listar(req, res) {
    try {
      const {
        cliente_id,
        venda_id,
        status,
        data_vencimento_inicio,
        data_vencimento_fim,
        periodo, // hoje, semana, mes, trimestre, ano
        vencidas,
        inadimplentes,
        forma_pagamento,
        page = 1,
        limit = 50,
        order_by = 'data_vencimento',
        order_dir = 'ASC'
      } = req.query;

      let sql = `
        SELECT 
          cr.*,
          c.nome_razao_social as cliente_nome,
          c.cpf_cnpj as cliente_documento,
          c.telefone as cliente_telefone,
          c.email as cliente_email,
          v.numero as venda_numero,
          u.nome as usuario_criacao_nome,
          DATEDIFF(CURDATE(), cr.data_vencimento) as dias_vencimento,
          CASE
            WHEN cr.status = 'QUITADO' THEN 'QUITADO'
            WHEN cr.data_vencimento < CURDATE() AND cr.status != 'CANCELADO' THEN 'VENCIDO'
            ELSE cr.status
          END as status_calculado
        FROM contas_receber cr
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        LEFT JOIN vendas v ON cr.venda_id = v.id
        LEFT JOIN usuarios u ON cr.usuario_criacao_id = u.id
        WHERE 1=1
      `;

      const params = [];

      // Filtros
      if (cliente_id) {
        sql += ' AND cr.cliente_id = ?';
        params.push(cliente_id);
      }

      if (venda_id) {
        sql += ' AND cr.venda_id = ?';
        params.push(venda_id);
      }

      if (status) {
        if (status === 'VENCIDO') {
          sql += ' AND cr.data_vencimento < CURDATE() AND cr.status IN (?, ?)';
          params.push('PENDENTE', 'PARCIAL');
        } else {
          sql += ' AND cr.status = ?';
          params.push(status);
        }
      }

      if (vencidas === 'true') {
        sql += ' AND cr.data_vencimento < CURDATE() AND cr.status IN (?, ?)';
        params.push('PENDENTE', 'PARCIAL');
      }

      if (forma_pagamento) {
        sql += ' AND cr.forma_pagamento = ?';
        params.push(forma_pagamento);
      }

      // Filtros de período
      if (periodo) {
        const hoje = new Date();
        let dataInicio;

        switch (periodo) {
          case 'hoje':
            dataInicio = hoje.toISOString().split('T')[0];
            sql += ' AND cr.data_vencimento = ?';
            params.push(dataInicio);
            break;
          case 'semana':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 7)).toISOString().split('T')[0];
            sql += ' AND cr.data_vencimento >= ?';
            params.push(dataInicio);
            break;
          case 'mes':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
            sql += ' AND cr.data_vencimento >= ?';
            params.push(dataInicio);
            break;
          case 'trimestre':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
            sql += ' AND cr.data_vencimento >= ?';
            params.push(dataInicio);
            break;
          case 'ano':
            dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
            sql += ' AND cr.data_vencimento >= ?';
            params.push(dataInicio);
            break;
        }
      }

      if (data_vencimento_inicio) {
        sql += ' AND cr.data_vencimento >= ?';
        params.push(data_vencimento_inicio);
      }

      if (data_vencimento_fim) {
        sql += ' AND cr.data_vencimento <= ?';
        params.push(data_vencimento_fim);
      }

      // Ordenação
      const allowedOrderBy = ['data_vencimento', 'valor_total', 'cliente_nome', 'status'];
      const orderByField = allowedOrderBy.includes(order_by) ? order_by : 'data_vencimento';
      const orderDirection = order_dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      sql += ` ORDER BY ${orderByField} ${orderDirection}`;

      // Paginação
      const offset = (page - 1) * limit;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [contas] = await pool.query(sql, params);

      // Contar total
      let countSql = `SELECT COUNT(*) as total FROM contas_receber cr WHERE 1=1`;
      const countParams = params.slice(0, -2);
      const [countResult] = await pool.query(countSql, countParams);
      const total = countResult[0].total;

      // Totalizadores
      const [totalizadores] = await pool.query(`
        SELECT 
          COUNT(*) as total_contas,
          SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status = 'QUITADO' THEN 1 ELSE 0 END) as quitadas,
          SUM(CASE WHEN data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL') THEN 1 ELSE 0 END) as vencidas,
          SUM(valor_total) as valor_total,
          SUM(CASE WHEN status = 'QUITADO' THEN valor_total ELSE 0 END) as valor_recebido,
          SUM(valor_restante) as valor_restante,
          SUM(CASE WHEN data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL') THEN valor_restante ELSE 0 END) as valor_vencido
        FROM contas_receber
      `);

      res.json({
        success: true,
        contas,
        totalizadores: totalizadores[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao listar contas a receber:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar contas a receber',
        message: error.message
      });
    }
  }

  /**
   * Buscar conta específica
   */
  async buscar(req, res) {
    try {
      const { id } = req.params;

      const [contas] = await pool.query(`
        SELECT 
          cr.*,
          c.nome_razao_social as cliente_nome,
          c.cpf_cnpj as cliente_documento,
          c.telefone as cliente_telefone,
          c.email as cliente_email,
          c.endereco as cliente_endereco,
          v.numero as venda_numero,
          v.data_venda,
          u1.nome as usuario_criacao_nome
        FROM contas_receber cr
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        LEFT JOIN vendas v ON cr.venda_id = v.id
        LEFT JOIN usuarios u1 ON cr.usuario_criacao_id = u1.id
        WHERE cr.id = ?
      `, [id]);

      if (contas.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conta a receber não encontrada'
        });
      }

      // Buscar parcelas
      const [parcelas] = await pool.query(`
        SELECT * FROM contas_receber_parcelas
        WHERE conta_receber_id = ?
        ORDER BY numero_parcela ASC
      `, [id]);

      res.json({
        success: true,
        conta: contas[0],
        parcelas
      });
    } catch (error) {
      console.error('Erro ao buscar conta a receber:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar conta a receber',
        message: error.message
      });
    }
  }

  // ========================================
  // CRUD
  // ========================================

  /**
   * Criar nova conta a receber
   */
  async criar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        venda_id,
        cliente_id,
        valor_total,
        data_vencimento,
        forma_pagamento,
        parcelas = 1,
        observacoes
      } = req.body;

      // Validações
      if (!cliente_id || !valor_total || !data_vencimento || !forma_pagamento) {
        throw new Error('Campos obrigatórios: cliente, valor, data de vencimento e forma de pagamento');
      }

      // Inserir conta principal
      const [result] = await connection.query(`
        INSERT INTO contas_receber (
          venda_id, cliente_id, valor_total, valor_restante,
          data_vencimento, forma_pagamento, parcelas, observacoes,
          usuario_criacao_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        venda_id, cliente_id, valor_total, valor_total,
        data_vencimento, forma_pagamento, parcelas, observacoes,
        req.user?.id || 1
      ]);

      const contaId = result.insertId;

      // Criar parcelas
      if (parcelas > 1) {
        const valorParcela = valor_total / parcelas;
        const dataBase = new Date(data_vencimento);

        for (let i = 1; i <= parcelas; i++) {
          const dataVencimentoParcela = new Date(dataBase);
          dataVencimentoParcela.setMonth(dataBase.getMonth() + (i - 1));

          await connection.query(`
            INSERT INTO contas_receber_parcelas (
              conta_receber_id, numero_parcela, valor_parcela, data_vencimento
            ) VALUES (?, ?, ?, ?)
          `, [contaId, i, valorParcela, dataVencimentoParcela]);
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Conta a receber criada com sucesso',
        id: contaId
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao criar conta a receber:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar conta a receber',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Atualizar conta a receber
   */
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { observacoes, forma_pagamento } = req.body;

      // Verificar se existe
      const [contas] = await pool.query(
        'SELECT * FROM contas_receber WHERE id = ?',
        [id]
      );

      if (contas.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conta não encontrada'
        });
      }

      const conta = contas[0];

      // Não permitir editar se já foi quitada
      if (conta.status === 'QUITADO') {
        return res.status(400).json({
          success: false,
          error: 'Não é possível editar conta já quitada'
        });
      }

      const updates = [];
      const params = [];

      if (observacoes !== undefined) {
        updates.push('observacoes = ?');
        params.push(observacoes);
      }

      if (forma_pagamento) {
        updates.push('forma_pagamento = ?');
        params.push(forma_pagamento);
      }

      if (updates.length > 0) {
        params.push(id);
        await pool.query(
          `UPDATE contas_receber SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      res.json({
        success: true,
        message: 'Conta atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar conta',
        message: error.message
      });
    }
  }

  /**
   * Cancelar conta a receber
   */
  async cancelar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { motivo } = req.body;

      const [contas] = await connection.query(
        'SELECT * FROM contas_receber WHERE id = ?',
        [id]
      );

      if (contas.length === 0) {
        throw new Error('Conta não encontrada');
      }

      const conta = contas[0];

      if (conta.status === 'QUITADO') {
        throw new Error('Não é possível cancelar conta já quitada. Use estorno.');
      }

      await connection.query(
        `UPDATE contas_receber SET 
          status = 'CANCELADO',
          observacoes = CONCAT(COALESCE(observacoes, ''), '\nCancelado: ', ?)
        WHERE id = ?`,
        [motivo || 'Sem motivo informado', id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Conta cancelada com sucesso'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao cancelar conta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao cancelar conta',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ========================================
  // OPERAÇÕES FINANCEIRAS
  // ========================================

  /**
   * Baixar/receber conta ou parcela
   */
  async baixar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        valor_pago,
        data_pagamento,
        forma_pagamento,
        observacoes,
        parcela_id
      } = req.body;

      const dataPagamento = data_pagamento || new Date().toISOString().split('T')[0];

      if (parcela_id) {
        // Baixar parcela específica
        const [parcelas] = await connection.query(
          'SELECT * FROM contas_receber_parcelas WHERE id = ? AND conta_receber_id = ?',
          [parcela_id, id]
        );

        if (parcelas.length === 0) {
          throw new Error('Parcela não encontrada');
        }

        await connection.query(`
          UPDATE contas_receber_parcelas SET
            valor_pago = ?,
            data_pagamento = ?,
            forma_pagamento = ?,
            observacoes = ?,
            status = 'PAGO'
          WHERE id = ?
        `, [valor_pago, dataPagamento, forma_pagamento, observacoes, parcela_id]);

        // Atualizar conta principal
        const [totalPago] = await connection.query(
          'SELECT SUM(valor_pago) as total FROM contas_receber_parcelas WHERE conta_receber_id = ?',
          [id]
        );

        const valorRecebido = totalPago[0].total || 0;
        const [conta] = await connection.query('SELECT valor_total FROM contas_receber WHERE id = ?', [id]);
        const valorRestante = conta[0].valor_total - valorRecebido;
        const novoStatus = valorRestante <= 0 ? 'QUITADO' : 'PARCIAL';

        await connection.query(
          'UPDATE contas_receber SET valor_restante = ?, status = ? WHERE id = ?',
          [valorRestante, novoStatus, id]
        );

      } else {
        // Baixar conta integral
        await connection.query(`
          UPDATE contas_receber SET
            valor_restante = 0,
            status = 'QUITADO'
          WHERE id = ?
        `, [id]);

        // Atualizar todas as parcelas
        await connection.query(`
          UPDATE contas_receber_parcelas SET
            valor_pago = valor_parcela,
            data_pagamento = ?,
            forma_pagamento = ?,
            status = 'PAGO'
          WHERE conta_receber_id = ?
        `, [dataPagamento, forma_pagamento, id]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Recebimento registrado com sucesso'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao baixar conta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao baixar conta',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Estornar recebimento
   */
  async estornar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { motivo, parcela_id } = req.body;

      if (parcela_id) {
        // Estornar parcela
        await connection.query(`
          UPDATE contas_receber_parcelas SET
            valor_pago = 0,
            data_pagamento = NULL,
            status = 'PENDENTE',
            observacoes = CONCAT(COALESCE(observacoes, ''), '\nEstorno: ', ?)
          WHERE id = ?
        `, [motivo || 'Sem motivo informado', parcela_id]);

        // Atualizar total recebido
        const [totalPago] = await connection.query(
          'SELECT SUM(valor_pago) as total FROM contas_receber_parcelas WHERE conta_receber_id = ?',
          [id]
        );

        const [conta] = await connection.query('SELECT valor_total FROM contas_receber WHERE id = ?', [id]);
        const valorRestante = conta[0].valor_total - (totalPago[0].total || 0);

        await connection.query(
          'UPDATE contas_receber SET valor_restante = ?, status = ? WHERE id = ?',
          [valorRestante, valorRestante > 0 ? 'PARCIAL' : 'PENDENTE', id]
        );

      } else {
        // Estornar conta integral
        await connection.query(`
          UPDATE contas_receber SET
            valor_restante = valor_total,
            status = 'PENDENTE'
          WHERE id = ?
        `, [id]);

        await connection.query(`
          UPDATE contas_receber_parcelas SET
            valor_pago = 0,
            data_pagamento = NULL,
            status = 'PENDENTE'
          WHERE conta_receber_id = ?
        `, [id]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Recebimento estornado com sucesso'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao estornar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao estornar',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ========================================
  // RELATÓRIOS E DASHBOARDS
  // ========================================

  /**
   * Dashboard com indicadores
   */
  async dashboard(req, res) {
    try {
      const { mes, ano } = req.query;
      const dataAtual = new Date();
      const mesAtual = mes || (dataAtual.getMonth() + 1);
      const anoAtual = ano || dataAtual.getFullYear();

      // Totalizadores gerais
      const [totais] = await pool.query(`
        SELECT 
          COUNT(*) as total_contas,
          SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status = 'QUITADO' THEN 1 ELSE 0 END) as quitadas,
          SUM(CASE WHEN data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL') THEN 1 ELSE 0 END) as vencidas,
          SUM(valor_total) as valor_total,
          SUM(CASE WHEN status = 'QUITADO' THEN valor_total ELSE 0 END) as valor_recebido,
          SUM(valor_restante) as valor_a_receber,
          SUM(CASE WHEN data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL') THEN valor_restante ELSE 0 END) as valor_inadimplente
        FROM contas_receber
        WHERE YEAR(data_vencimento) = ?
          AND MONTH(data_vencimento) = ?
      `, [anoAtual, mesAtual]);

      // Vencimentos próximos
      const [vencimentosProximos] = await pool.query(`
        SELECT 
          cr.id, cr.valor_restante, cr.data_vencimento,
          c.nome_razao_social as cliente_nome,
          v.numero as venda_numero
        FROM contas_receber cr
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        LEFT JOIN vendas v ON cr.venda_id = v.id
        WHERE cr.status IN ('PENDENTE', 'PARCIAL')
          AND cr.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY cr.data_vencimento ASC
        LIMIT 10
      `);

      // Contas inadimplentes
      const [inadimplentes] = await pool.query(`
        SELECT 
          cr.id, cr.valor_restante, cr.data_vencimento,
          DATEDIFF(CURDATE(), cr.data_vencimento) as dias_atraso,
          c.nome_razao_social as cliente_nome,
          c.telefone as cliente_telefone
        FROM contas_receber cr
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        WHERE cr.status IN ('PENDENTE', 'PARCIAL')
          AND cr.data_vencimento < CURDATE()
        ORDER BY dias_atraso DESC
        LIMIT 10
      `);

      // Maiores devedores
      const [maioresDevedores] = await pool.query(`
        SELECT 
          c.id, c.nome_razao_social, c.cpf_cnpj, c.telefone,
          COUNT(cr.id) as total_contas,
          SUM(cr.valor_restante) as valor_total
        FROM clientes c
        INNER JOIN contas_receber cr ON c.id = cr.cliente_id
        WHERE cr.status IN ('PENDENTE', 'PARCIAL')
        GROUP BY c.id
        ORDER BY valor_total DESC
        LIMIT 5
      `);

      // Evolução mensal
      const [evolucaoMensal] = await pool.query(`
        SELECT 
          DATE_FORMAT(data_vencimento, '%Y-%m') as mes,
          COUNT(*) as total_contas,
          SUM(valor_total) as valor_total,
          SUM(CASE WHEN status = 'QUITADO' THEN valor_total ELSE 0 END) as valor_recebido
        FROM contas_receber
        WHERE data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(data_vencimento, '%Y-%m')
        ORDER BY mes ASC
      `);

      res.json({
        success: true,
        totais: totais[0],
        vencimentosProximos,
        inadimplentes,
        maioresDevedores,
        evolucaoMensal
      });
    } catch (error) {
      console.error('Erro ao gerar dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar dashboard',
        message: error.message
      });
    }
  }

  /**
   * Relatório de inadimplência
   */
  async relatorioInadimplencia(req, res) {
    try {
      const [contas] = await pool.query(`
        SELECT 
          cr.*,
          c.nome_razao_social as cliente_nome,
          c.cpf_cnpj as cliente_documento,
          c.telefone as cliente_telefone,
          c.email as cliente_email,
          DATEDIFF(CURDATE(), cr.data_vencimento) as dias_atraso
        FROM contas_receber cr
        LEFT JOIN clientes c ON cr.cliente_id = c.id
        WHERE cr.status IN ('PENDENTE', 'PARCIAL')
          AND cr.data_vencimento < CURDATE()
        ORDER BY dias_atraso DESC
      `);

      const valorTotal = contas.reduce((sum, c) => sum + parseFloat(c.valor_restante), 0);

      res.json({
        success: true,
        contas,
        total: contas.length,
        valorTotal
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar relatório',
        message: error.message
      });
    }
  }
}

module.exports = new ContasReceberController();
