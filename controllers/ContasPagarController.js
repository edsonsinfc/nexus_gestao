const pool = require('../db');

class ContasPagarController {
  // ========================================
  // LISTAGEM E FILTROS
  // ========================================
  
  /**
   * Listar contas a pagar com filtros avançados
   */
  async listar(req, res) {
    try {
      const {
        fornecedor_id,
        categoria_id,
        status,
        data_vencimento_inicio,
        data_vencimento_fim,
        data_emissao_inicio,
        data_emissao_fim,
        data_pagamento_inicio,
        data_pagamento_fim,
        periodo, // hoje, semana, mes, trimestre, ano
        vencidas,
        forma_pagamento,
        numero_documento,
        page = 1,
        limit = 50,
        order_by = 'data_vencimento',
        order_dir = 'ASC'
      } = req.query;

      let sql = `
        SELECT 
          cp.*,
          f.razao_social as fornecedor_nome,
          f.nome_fantasia as fornecedor_fantasia,
          f.cnpj as fornecedor_cnpj,
          cf.nome as categoria_nome,
          cf.codigo as categoria_codigo,
          cb.banco_nome as conta_bancaria_nome,
          u.nome as usuario_criacao_nome,
          DATEDIFF(CURDATE(), cp.data_vencimento) as dias_vencimento,
          CASE
            WHEN cp.status = 'PAGO' THEN 'PAGO'
            WHEN cp.data_vencimento < CURDATE() AND cp.status != 'CANCELADO' THEN 'VENCIDO'
            ELSE cp.status
          END as status_calculado
        FROM contas_pagar cp
        LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
        LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
        LEFT JOIN contas_bancarias cb ON cp.conta_bancaria_id = cb.id
        LEFT JOIN usuarios u ON cp.usuario_criacao_id = u.id
        WHERE 1=1
      `;

      const params = [];

      // Filtros
      if (fornecedor_id) {
        sql += ' AND cp.fornecedor_id = ?';
        params.push(fornecedor_id);
      }

      if (categoria_id) {
        sql += ' AND cp.categoria_id = ?';
        params.push(categoria_id);
      }

      if (status) {
        if (status === 'VENCIDO') {
          sql += ' AND cp.data_vencimento < CURDATE() AND cp.status IN (?, ?)';
          params.push('PENDENTE', 'PARCIAL');
        } else {
          sql += ' AND cp.status = ?';
          params.push(status);
        }
      }

      if (vencidas === 'true') {
        sql += ' AND cp.data_vencimento < CURDATE() AND cp.status IN (?, ?)';
        params.push('PENDENTE', 'PARCIAL');
      }

      if (forma_pagamento) {
        sql += ' AND cp.forma_pagamento = ?';
        params.push(forma_pagamento);
      }

      if (numero_documento) {
        sql += ' AND cp.numero_documento LIKE ?';
        params.push(`%${numero_documento}%`);
      }

      // Filtros de data
      if (periodo) {
        const hoje = new Date();
        let dataInicio;

        switch (periodo) {
          case 'hoje':
            dataInicio = hoje.toISOString().split('T')[0];
            sql += ' AND cp.data_vencimento = ?';
            params.push(dataInicio);
            break;
          case 'semana':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 7)).toISOString().split('T')[0];
            sql += ' AND cp.data_vencimento >= ?';
            params.push(dataInicio);
            break;
          case 'mes':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
            sql += ' AND cp.data_vencimento >= ?';
            params.push(dataInicio);
            break;
          case 'trimestre':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
            sql += ' AND cp.data_vencimento >= ?';
            params.push(dataInicio);
            break;
          case 'ano':
            dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
            sql += ' AND cp.data_vencimento >= ?';
            params.push(dataInicio);
            break;
        }
      }

      if (data_vencimento_inicio) {
        sql += ' AND cp.data_vencimento >= ?';
        params.push(data_vencimento_inicio);
      }

      if (data_vencimento_fim) {
        sql += ' AND cp.data_vencimento <= ?';
        params.push(data_vencimento_fim);
      }

      if (data_emissao_inicio) {
        sql += ' AND cp.data_emissao >= ?';
        params.push(data_emissao_inicio);
      }

      if (data_emissao_fim) {
        sql += ' AND cp.data_emissao <= ?';
        params.push(data_emissao_fim);
      }

      if (data_pagamento_inicio) {
        sql += ' AND cp.data_pagamento >= ?';
        params.push(data_pagamento_inicio);
      }

      if (data_pagamento_fim) {
        sql += ' AND cp.data_pagamento <= ?';
        params.push(data_pagamento_fim);
      }

      // Ordenação
      const allowedOrderBy = ['data_vencimento', 'data_emissao', 'data_pagamento', 'valor_total', 'fornecedor_nome', 'status'];
      const orderByField = allowedOrderBy.includes(order_by) ? order_by : 'data_vencimento';
      const orderDirection = order_dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      sql += ` ORDER BY ${orderByField} ${orderDirection}`;

      // Paginação
      const offset = (page - 1) * limit;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [contas] = await pool.query(sql, params);

      // Contar total de registros (sem os parâmetros de paginação)
      const countParams = params.slice(0, -2); // Remove limit e offset
      
      // Montar countSql com os mesmos filtros
      let countSql = 'SELECT COUNT(*) as total FROM contas_pagar cp WHERE 1=1';
      
      // Aplicar os mesmos filtros do SQL principal
      if (fornecedor_id) countSql += ' AND cp.fornecedor_id = ?';
      if (categoria_id) countSql += ' AND cp.categoria_id = ?';
      if (status) {
        if (status === 'VENCIDO') {
          countSql += ' AND cp.data_vencimento < CURDATE() AND cp.status IN (?, ?)';
        } else {
          countSql += ' AND cp.status = ?';
        }
      }
      if (vencidas === 'true') countSql += ' AND cp.data_vencimento < CURDATE() AND cp.status IN (?, ?)';
      if (forma_pagamento) countSql += ' AND cp.forma_pagamento = ?';
      if (numero_documento) countSql += ' AND cp.numero_documento LIKE ?';
      if (data_vencimento_inicio) countSql += ' AND cp.data_vencimento >= ?';
      if (data_vencimento_fim) countSql += ' AND cp.data_vencimento <= ?';
      if (data_emissao_inicio) countSql += ' AND cp.data_emissao >= ?';
      if (data_emissao_fim) countSql += ' AND cp.data_emissao <= ?';
      if (data_pagamento_inicio) countSql += ' AND cp.data_pagamento >= ?';
      if (data_pagamento_fim) countSql += ' AND cp.data_pagamento <= ?';

      const [countResult] = await pool.query(countSql, countParams);
      const total = countResult[0].total;

      // Calcular totalizadores
      const [totalizadores] = await pool.query(`
        SELECT 
          COUNT(*) as total_contas,
          SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status = 'PAGO' THEN 1 ELSE 0 END) as pagas,
          SUM(CASE WHEN status = 'VENCIDO' OR (data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL')) THEN 1 ELSE 0 END) as vencidas,
          SUM(valor_total) as valor_total,
          SUM(valor_pago) as valor_pago,
          SUM(valor_restante) as valor_restante,
          SUM(valor_juros) as total_juros,
          SUM(valor_multa) as total_multa,
          SUM(CASE WHEN status IN ('PENDENTE', 'PARCIAL', 'VENCIDO') AND data_vencimento < CURDATE() THEN valor_restante ELSE 0 END) as valor_vencido
        FROM contas_pagar
        WHERE deleted_at IS NULL
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
      console.error('Erro ao listar contas a pagar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar contas a pagar',
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
          cp.*,
          f.razao_social as fornecedor_nome,
          f.nome_fantasia as fornecedor_fantasia,
          f.cnpj as fornecedor_cnpj,
          f.telefone as fornecedor_telefone,
          f.email as fornecedor_email,
          cf.nome as categoria_nome,
          cf.codigo as categoria_codigo,
          cb.nome as conta_bancaria_nome,
          u1.nome as usuario_criacao_nome,
          u2.nome as usuario_atualizacao_nome,
          u3.nome as baixado_por_nome
        FROM contas_pagar cp
        LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
        LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
        LEFT JOIN contas_bancarias cb ON cp.conta_bancaria_id = cb.id
        LEFT JOIN usuarios u1 ON cp.usuario_criacao_id = u1.id
        LEFT JOIN usuarios u2 ON cp.usuario_atualizacao_id = u2.id
        LEFT JOIN usuarios u3 ON cp.baixado_por = u3.id
        WHERE cp.id = ? AND cp.deleted_at IS NULL
      `, [id]);

      if (contas.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conta a pagar não encontrada'
        });
      }

      // Buscar parcelas se houver
      const [parcelas] = await pool.query(`
        SELECT 
          p.*,
          cb.nome as conta_bancaria_nome,
          u.nome as baixado_por_nome
        FROM contas_pagar_parcelas p
        LEFT JOIN contas_bancarias cb ON p.conta_bancaria_id = cb.id
        LEFT JOIN usuarios u ON p.baixado_por = u.id
        WHERE p.conta_pagar_id = ?
        ORDER BY p.numero_parcela ASC
      `, [id]);

      // Buscar histórico
      const [historico] = await pool.query(`
        SELECT 
          h.*,
          u.nome as usuario_nome
        FROM contas_pagar_historico h
        LEFT JOIN usuarios u ON h.usuario_id = u.id
        WHERE h.conta_pagar_id = ?
        ORDER BY h.created_at DESC
      `, [id]);

      res.json({
        success: true,
        conta: contas[0],
        parcelas,
        historico
      });
    } catch (error) {
      console.error('Erro ao buscar conta a pagar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar conta a pagar',
        message: error.message
      });
    }
  }

  // ========================================
  // CRUD
  // ========================================

  /**
   * Criar nova conta a pagar
   */
  async criar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        fornecedor_id,
        categoria_id,
        numero_documento,
        descricao,
        valor_total,
        data_emissao,
        data_vencimento,
        forma_pagamento,
        conta_bancaria_id,
        banco,
        agencia,
        conta,
        favorecido,
        parcelas = 1,
        observacoes,
        tags,
        recorrente,
        frequencia_recorrencia,
        dia_recorrencia
      } = req.body;

      // Validações
      if (!fornecedor_id || !descricao || !valor_total || !data_emissao || !data_vencimento) {
        throw new Error('Campos obrigatórios: fornecedor, descrição, valor, data de emissão e data de vencimento');
      }

      // Gerar código interno único
      const [maxCodigo] = await connection.query(
        'SELECT MAX(CAST(SUBSTRING(codigo_interno, 3) AS UNSIGNED)) as max_codigo FROM contas_pagar WHERE codigo_interno LIKE "CP%"'
      );
      const proximoNumero = (maxCodigo[0].max_codigo || 0) + 1;
      const codigo_interno = `CP${String(proximoNumero).padStart(6, '0')}`;

      // Inserir conta principal
      const [result] = await connection.query(`
        INSERT INTO contas_pagar (
          codigo_interno, fornecedor_id, categoria_id, numero_documento,
          descricao, valor_total, valor_restante, valor_final,
          data_emissao, data_vencimento, parcelas,
          forma_pagamento, conta_bancaria_id, banco, agencia, conta, favorecido,
          observacoes, tags, recorrente, frequencia_recorrencia, dia_recorrencia,
          usuario_criacao_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        codigo_interno, fornecedor_id, categoria_id, numero_documento,
        descricao, valor_total, valor_total, valor_total,
        data_emissao, data_vencimento, parcelas,
        forma_pagamento, conta_bancaria_id, banco, agencia, conta, favorecido,
        observacoes, tags ? JSON.stringify(tags) : null,
        recorrente || 0, frequencia_recorrencia, dia_recorrencia,
        req.user?.id || 1
      ]);

      const contaId = result.insertId;

      // Criar parcelas se necessário
      if (parcelas > 1) {
        const valorParcela = valor_total / parcelas;
        const dataBase = new Date(data_vencimento);

        for (let i = 1; i <= parcelas; i++) {
          const dataVencimentoParcela = new Date(dataBase);
          dataVencimentoParcela.setMonth(dataBase.getMonth() + (i - 1));

          await connection.query(`
            INSERT INTO contas_pagar_parcelas (
              conta_pagar_id, numero_parcela, valor_parcela, valor_final, data_vencimento
            ) VALUES (?, ?, ?, ?, ?)
          `, [contaId, i, valorParcela, valorParcela, dataVencimentoParcela]);
        }
      }

      // Registrar no histórico
      await connection.query(`
        INSERT INTO contas_pagar_historico (
          conta_pagar_id, tipo_operacao, descricao, usuario_id
        ) VALUES (?, 'CRIACAO', ?, ?)
      `, [contaId, 'Conta a pagar criada', req.user?.id || 1]);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Conta a pagar criada com sucesso',
        id: contaId,
        codigo_interno
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao criar conta a pagar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar conta a pagar',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Atualizar conta a pagar
   */
  async atualizar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const campos = req.body;

      // Verificar se existe
      const [contas] = await connection.query(
        'SELECT * FROM contas_pagar WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (contas.length === 0) {
        throw new Error('Conta a pagar não encontrada');
      }

      const contaAntiga = contas[0];

      // Não permitir editar se já foi paga
      if (contaAntiga.status === 'PAGO' && campos.status !== 'PAGO') {
        throw new Error('Não é possível editar conta já paga. Use a função de estorno.');
      }

      // Construir update dinâmico
      const updates = [];
      const params = [];
      const camposPermitidos = [
        'fornecedor_id', 'categoria_id', 'numero_documento', 'descricao',
        'valor_total', 'data_emissao', 'data_vencimento', 'forma_pagamento',
        'conta_bancaria_id', 'banco', 'agencia', 'conta', 'favorecido',
        'observacoes', 'tags'
      ];

      for (const campo of camposPermitidos) {
        if (campos[campo] !== undefined) {
          updates.push(`${campo} = ?`);
          params.push(campo === 'tags' ? JSON.stringify(campos[campo]) : campos[campo]);
        }
      }

      if (updates.length > 0) {
        updates.push('usuario_atualizacao_id = ?');
        params.push(req.user?.id || 1);
        params.push(id);

        await connection.query(
          `UPDATE contas_pagar SET ${updates.join(', ')} WHERE id = ?`,
          params
        );

        // Registrar no histórico
        await connection.query(`
          INSERT INTO contas_pagar_historico (
            conta_pagar_id, tipo_operacao, descricao,
            dados_anteriores, dados_novos, usuario_id
          ) VALUES (?, 'EDICAO', ?, ?, ?, ?)
        `, [
          id,
          'Conta atualizada',
          JSON.stringify(contaAntiga),
          JSON.stringify(campos),
          req.user?.id || 1
        ]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Conta a pagar atualizada com sucesso'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao atualizar conta a pagar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar conta a pagar',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Excluir conta a pagar (soft delete)
   */
  async excluir(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;

      // Verificar se existe
      const [contas] = await connection.query(
        'SELECT * FROM contas_pagar WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (contas.length === 0) {
        throw new Error('Conta a pagar não encontrada');
      }

      const conta = contas[0];

      // Não permitir excluir se já foi paga
      if (conta.status === 'PAGO') {
        throw new Error('Não é possível excluir conta já paga');
      }

      // Soft delete
      await connection.query(
        'UPDATE contas_pagar SET deleted_at = NOW() WHERE id = ?',
        [id]
      );

      // Registrar no histórico
      await connection.query(`
        INSERT INTO contas_pagar_historico (
          conta_pagar_id, tipo_operacao, descricao, usuario_id
        ) VALUES (?, 'CANCELAMENTO', ?, ?)
      `, [id, 'Conta excluída', req.user?.id || 1]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Conta a pagar excluída com sucesso'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao excluir conta a pagar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao excluir conta a pagar',
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
   * Baixar/pagar conta ou parcela
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
        valor_juros = 0,
        valor_multa = 0,
        valor_desconto = 0,
        conta_bancaria_id,
        observacoes,
        parcela_id
      } = req.body;

      const dataPagamento = data_pagamento || new Date().toISOString().split('T')[0];

      if (parcela_id) {
        // Baixar parcela específica
        const [parcelas] = await connection.query(
          'SELECT * FROM contas_pagar_parcelas WHERE id = ? AND conta_pagar_id = ?',
          [parcela_id, id]
        );

        if (parcelas.length === 0) {
          throw new Error('Parcela não encontrada');
        }

        const parcela = parcelas[0];
        const valorTotal = parseFloat(parcela.valor_parcela) + parseFloat(valor_juros) + parseFloat(valor_multa) - parseFloat(valor_desconto);

        await connection.query(`
          UPDATE contas_pagar_parcelas SET
            valor_pago = ?,
            valor_juros = ?,
            valor_multa = ?,
            valor_desconto = ?,
            valor_final = ?,
            data_pagamento = ?,
            forma_pagamento = ?,
            conta_bancaria_id = ?,
            observacoes = ?,
            status = 'PAGO',
            baixado_por = ?,
            data_baixa = NOW()
          WHERE id = ?
        `, [
          valor_pago, valor_juros, valor_multa, valor_desconto, valorTotal,
          dataPagamento, forma_pagamento, conta_bancaria_id, observacoes,
          req.user?.id || 1, parcela_id
        ]);

        // Atualizar conta principal
        const [totalPago] = await connection.query(
          'SELECT SUM(valor_pago) as total FROM contas_pagar_parcelas WHERE conta_pagar_id = ?',
          [id]
        );

        await connection.query(
          'UPDATE contas_pagar SET valor_pago = ? WHERE id = ?',
          [totalPago[0].total || 0, id]
        );

        // Registrar histórico
        await connection.query(`
          INSERT INTO contas_pagar_historico (
            conta_pagar_id, parcela_id, tipo_operacao, descricao, usuario_id
          ) VALUES (?, ?, 'BAIXA', ?, ?)
        `, [id, parcela_id, `Parcela ${parcela.numero_parcela} paga`, req.user?.id || 1]);

      } else {
        // Baixar conta integral
        const [contas] = await connection.query(
          'SELECT * FROM contas_pagar WHERE id = ? AND deleted_at IS NULL',
          [id]
        );

        if (contas.length === 0) {
          throw new Error('Conta não encontrada');
        }

        const conta = contas[0];
        const valorTotal = parseFloat(conta.valor_total) + parseFloat(valor_juros) + parseFloat(valor_multa) - parseFloat(valor_desconto);

        await connection.query(`
          UPDATE contas_pagar SET
            valor_pago = ?,
            valor_restante = 0,
            valor_juros = ?,
            valor_multa = ?,
            valor_desconto = ?,
            valor_final = ?,
            data_pagamento = ?,
            forma_pagamento = ?,
            conta_bancaria_id = ?,
            status = 'PAGO',
            baixado_por = ?,
            data_baixa = NOW()
          WHERE id = ?
        `, [
          valor_pago, valor_juros, valor_multa, valor_desconto, valorTotal,
          dataPagamento, forma_pagamento, conta_bancaria_id,
          req.user?.id || 1, id
        ]);

        // Registrar histórico
        await connection.query(`
          INSERT INTO contas_pagar_historico (
            conta_pagar_id, tipo_operacao, descricao, usuario_id
          ) VALUES (?, 'BAIXA', ?, ?)
        `, [id, 'Conta paga integralmente', req.user?.id || 1]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Pagamento registrado com sucesso'
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
   * Estornar pagamento
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
          UPDATE contas_pagar_parcelas SET
            valor_pago = 0,
            valor_juros = 0,
            valor_multa = 0,
            valor_desconto = 0,
            data_pagamento = NULL,
            status = 'PENDENTE',
            observacoes = CONCAT(COALESCE(observacoes, ''), '\nEstorno: ', ?)
          WHERE id = ? AND conta_pagar_id = ?
        `, [motivo || 'Sem motivo informado', parcela_id, id]);

        // Atualizar total pago da conta
        const [totalPago] = await connection.query(
          'SELECT SUM(valor_pago) as total FROM contas_pagar_parcelas WHERE conta_pagar_id = ?',
          [id]
        );

        await connection.query(
          'UPDATE contas_pagar SET valor_pago = ?, status = "PARCIAL" WHERE id = ?',
          [totalPago[0].total || 0, id]
        );

        await connection.query(`
          INSERT INTO contas_pagar_historico (
            conta_pagar_id, parcela_id, tipo_operacao, descricao, usuario_id
          ) VALUES (?, ?, 'ESTORNO', ?, ?)
        `, [id, parcela_id, `Parcela estornada: ${motivo}`, req.user?.id || 1]);

      } else {
        // Estornar conta integral
        await connection.query(`
          UPDATE contas_pagar SET
            valor_pago = 0,
            valor_restante = valor_total,
            valor_juros = 0,
            valor_multa = 0,
            valor_desconto = 0,
            data_pagamento = NULL,
            status = 'PENDENTE',
            baixado_por = NULL,
            data_baixa = NULL
          WHERE id = ?
        `, [id]);

        await connection.query(`
          INSERT INTO contas_pagar_historico (
            conta_pagar_id, tipo_operacao, descricao, usuario_id
          ) VALUES (?, 'ESTORNO', ?, ?)
        `, [id, `Pagamento estornado: ${motivo}`, req.user?.id || 1]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Pagamento estornado com sucesso'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Erro ao estornar pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao estornar pagamento',
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
          SUM(CASE WHEN status = 'PAGO' THEN 1 ELSE 0 END) as pagas,
          SUM(CASE WHEN data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL') THEN 1 ELSE 0 END) as vencidas,
          SUM(valor_total) as valor_total,
          SUM(valor_pago) as valor_pago,
          SUM(valor_restante) as valor_restante,
          SUM(CASE WHEN data_vencimento < CURDATE() AND status IN ('PENDENTE', 'PARCIAL') THEN valor_restante ELSE 0 END) as valor_vencido
        FROM contas_pagar
        WHERE deleted_at IS NULL
          AND YEAR(data_vencimento) = ?
          AND MONTH(data_vencimento) = ?
      `, [anoAtual, mesAtual]);

      // Vencimentos próximos (próximos 7 dias)
      const [vencimentosProximos] = await pool.query(`
        SELECT 
          cp.id, cp.numero_documento, cp.descricao,
          cp.valor_restante, cp.data_vencimento,
          f.razao_social as fornecedor_nome
        FROM contas_pagar cp
        LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
        WHERE cp.deleted_at IS NULL
          AND cp.status IN ('PENDENTE', 'PARCIAL')
          AND cp.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY cp.data_vencimento ASC
        LIMIT 10
      `);

      // Contas vencidas
      const [contasVencidas] = await pool.query(`
        SELECT 
          cp.id, cp.numero_documento, cp.descricao,
          cp.valor_restante, cp.data_vencimento,
          DATEDIFF(CURDATE(), cp.data_vencimento) as dias_vencido,
          f.razao_social as fornecedor_nome
        FROM contas_pagar cp
        LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
        WHERE cp.deleted_at IS NULL
          AND cp.status IN ('PENDENTE', 'PARCIAL')
          AND cp.data_vencimento < CURDATE()
        ORDER BY cp.data_vencimento ASC
        LIMIT 10
      `);

      // Maiores fornecedores (valor a pagar)
      const [maioresFornecedores] = await pool.query(`
        SELECT 
          f.id, f.razao_social, f.nome_fantasia,
          COUNT(cp.id) as total_contas,
          SUM(cp.valor_restante) as valor_total
        FROM fornecedores f
        INNER JOIN contas_pagar cp ON f.id = cp.fornecedor_id
        WHERE cp.deleted_at IS NULL
          AND cp.status IN ('PENDENTE', 'PARCIAL')
        GROUP BY f.id, f.razao_social, f.nome_fantasia
        ORDER BY valor_total DESC
        LIMIT 5
      `);

      // Evolução mensal (últimos 6 meses)
      const [evolucaoMensal] = await pool.query(`
        SELECT 
          DATE_FORMAT(data_vencimento, '%Y-%m') as mes,
          COUNT(*) as total_contas,
          SUM(valor_total) as valor_total,
          SUM(valor_pago) as valor_pago
        FROM contas_pagar
        WHERE deleted_at IS NULL
          AND data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(data_vencimento, '%Y-%m')
        ORDER BY mes ASC
      `);

      // Distribuição por categoria
      const [porCategoria] = await pool.query(`
        SELECT 
          cf.nome as categoria,
          COUNT(cp.id) as total_contas,
          SUM(cp.valor_restante) as valor_total
        FROM categorias_financeiras cf
        LEFT JOIN contas_pagar cp ON cf.id = cp.categoria_id AND cp.deleted_at IS NULL AND cp.status IN ('PENDENTE', 'PARCIAL')
        WHERE cf.tipo = 'DESPESA' AND cf.ativa = 1
        GROUP BY cf.id, cf.nome
        HAVING total_contas > 0
        ORDER BY valor_total DESC
      `);

      res.json({
        success: true,
        totais: totais[0],
        vencimentosProximos,
        contasVencidas,
        maioresFornecedores,
        evolucaoMensal,
        porCategoria
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
   * Relatório de contas vencidas
   */
  async relatorioVencidas(req, res) {
    try {
      const [contas] = await pool.query(`
        SELECT * FROM vw_contas_pagar_vencidas
        ORDER BY dias_vencido DESC
      `);

      res.json({
        success: true,
        contas,
        total: contas.length,
        valorTotal: contas.reduce((sum, c) => sum + parseFloat(c.valor_total_vencido), 0)
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de vencidas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar relatório',
        message: error.message
      });
    }
  }
}

module.exports = new ContasPagarController();
