const db = require('../db');

/**
 * Controller para Fluxo de Caixa
 * Gerencia entradas, saídas e projeções de caixa
 */

const FluxoCaixaController = {
  /**
   * Gerar fluxo de caixa por período
   * @route GET /api/fluxo-caixa
   */
  async gerarFluxoCaixa(req, res) {
    try {
      const { data_inicio, data_fim, conta_bancaria_id, tipo_visualizacao = 'realizado' } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Período obrigatório (data_inicio e data_fim)' });
      }

      let contaCondition = '';
      const params = [data_inicio, data_fim];

      if (conta_bancaria_id) {
        contaCondition = 'AND l.conta_bancaria_id = ?';
        params.push(conta_bancaria_id);
      }

      // Saldo inicial (até data_inicio)
      const [saldoInicial] = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE -valor END), 0) as saldo
        FROM lancamentos_financeiros l
        WHERE data_lancamento < ?
          AND status = 'PAGO'
          ${contaCondition}
      `, [data_inicio, ...(conta_bancaria_id ? [conta_bancaria_id] : [])]);

      // Entradas (receitas)
      const dataField = tipo_visualizacao === 'realizado' ? 'data_pagamento' : 'data_vencimento';
      const statusCondition = tipo_visualizacao === 'realizado' ? "AND l.status = 'PAGO'" : "AND l.status IN ('PENDENTE', 'PAGO')";

      const [entradas] = await db.query(`
        SELECT 
          l.id,
          l.descricao,
          l.valor,
          COALESCE(l.${dataField}, l.data_lancamento) as data,
          l.status,
          l.forma_pagamento,
          c.nome as categoria,
          CASE 
            WHEN l.pessoa_tipo = 'CLIENTE' THEN (SELECT nome_razao_social FROM clientes WHERE id = l.pessoa_id)
            WHEN l.pessoa_tipo = 'FORNECEDOR' THEN (SELECT razao_social FROM fornecedores WHERE id = l.pessoa_id)
            ELSE NULL
          END as pessoa_nome
        FROM lancamentos_financeiros l
        LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
        WHERE l.tipo = 'RECEITA'
          AND COALESCE(l.${dataField}, l.data_lancamento) BETWEEN ? AND ?
          ${statusCondition}
          ${contaCondition}
        ORDER BY COALESCE(l.${dataField}, l.data_lancamento), l.id
      `, params);

      const totalEntradas = entradas.reduce((sum, e) => sum + parseFloat(e.valor), 0);

      // Saídas (despesas)
      const [saidas] = await db.query(`
        SELECT 
          l.id,
          l.descricao,
          l.valor,
          COALESCE(l.${dataField}, l.data_lancamento) as data,
          l.status,
          l.forma_pagamento,
          c.nome as categoria,
          CASE 
            WHEN l.pessoa_tipo = 'CLIENTE' THEN (SELECT nome_razao_social FROM clientes WHERE id = l.pessoa_id)
            WHEN l.pessoa_tipo = 'FORNECEDOR' THEN (SELECT razao_social FROM fornecedores WHERE id = l.pessoa_id)
            ELSE NULL
          END as pessoa_nome
        FROM lancamentos_financeiros l
        LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
        WHERE l.tipo = 'DESPESA'
          AND COALESCE(l.${dataField}, l.data_lancamento) BETWEEN ? AND ?
          ${statusCondition}
          ${contaCondition}
        ORDER BY COALESCE(l.${dataField}, l.data_lancamento), l.id
      `, params);

      const totalSaidas = saidas.reduce((sum, s) => sum + parseFloat(s.valor), 0);

      // Saldo final
      const saldoFinal = parseFloat(saldoInicial[0].saldo) + totalEntradas - totalSaidas;

      // Fluxo diário (agrupado por dia)
      const [fluxoDiario] = await db.query(`
        SELECT 
          DATE(COALESCE(${dataField}, data_lancamento)) as data,
          SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE 0 END) as entradas,
          SUM(CASE WHEN tipo = 'DESPESA' THEN valor ELSE 0 END) as saidas,
          SUM(CASE WHEN tipo = 'RECEITA' THEN valor ELSE -valor END) as saldo_dia
        FROM lancamentos_financeiros l
        WHERE COALESCE(${dataField}, data_lancamento) BETWEEN ? AND ?
          ${statusCondition}
          ${contaCondition}
        GROUP BY DATE(COALESCE(${dataField}, data_lancamento))
        ORDER BY DATE(COALESCE(${dataField}, data_lancamento))
      `, params);

      // Calcular saldo acumulado
      let saldoAcumulado = parseFloat(saldoInicial[0].saldo);
      const fluxoDiarioComAcumulado = fluxoDiario.map(dia => {
        saldoAcumulado += parseFloat(dia.saldo_dia);
        return {
          data: dia.data,
          entradas: parseFloat(dia.entradas),
          saidas: parseFloat(dia.saidas),
          saldo_dia: parseFloat(dia.saldo_dia),
          saldo_acumulado: saldoAcumulado
        };
      });

      // Estatísticas por categoria
      const [estatisticasCategorias] = await db.query(`
        SELECT 
          l.tipo,
          COALESCE(c.nome, 'Sem categoria') as categoria,
          COUNT(*) as quantidade_lancamentos,
          SUM(l.valor) as total
        FROM lancamentos_financeiros l
        LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
        WHERE COALESCE(l.${dataField}, l.data_lancamento) BETWEEN ? AND ?
          ${statusCondition}
          ${contaCondition}
        GROUP BY l.tipo, c.id, c.nome
        ORDER BY l.tipo, total DESC
      `, params);

      const fluxoCaixa = {
        periodo: { data_inicio, data_fim },
        tipo_visualizacao,
        resumo: {
          saldo_inicial: parseFloat(saldoInicial[0].saldo),
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          saldo_periodo: totalEntradas - totalSaidas,
          saldo_final: saldoFinal
        },
        entradas: entradas.map(e => ({
          ...e,
          valor: parseFloat(e.valor)
        })),
        saidas: saidas.map(s => ({
          ...s,
          valor: parseFloat(s.valor)
        })),
        fluxo_diario: fluxoDiarioComAcumulado,
        estatisticas_categorias: estatisticasCategorias.map(e => ({
          ...e,
          total: parseFloat(e.total)
        }))
      };

      res.json({ fluxo_caixa: fluxoCaixa });

    } catch (error) {
      console.error('Erro ao gerar fluxo de caixa:', error);
      res.status(500).json({ error: 'Erro ao gerar fluxo de caixa' });
    }
  },

  /**
   * Criar lançamento financeiro
   * @route POST /api/fluxo-caixa/lancamentos
   */
  async criarLancamento(req, res) {
    try {
      const {
        tipo, categoria_id, conta_bancaria_id, descricao, valor,
        data_lancamento, data_vencimento, data_pagamento, status,
        forma_pagamento, numero_documento, pessoa_id, pessoa_tipo,
        observacoes
      } = req.body;

      const usuario_id = req.user.id;

      if (!tipo || !descricao || !valor || !data_lancamento) {
        return res.status(400).json({ error: 'Campos obrigatórios: tipo, descricao, valor, data_lancamento' });
      }

      const [result] = await db.query(`
        INSERT INTO lancamentos_financeiros (
          tipo, categoria_id, conta_bancaria_id, descricao, valor,
          data_lancamento, data_vencimento, data_pagamento, status,
          forma_pagamento, numero_documento, pessoa_id, pessoa_tipo,
          observacoes, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        tipo, categoria_id || null, conta_bancaria_id || null, descricao, valor,
        data_lancamento, data_vencimento || null, data_pagamento || null, status || 'PENDENTE',
        forma_pagamento || null, numero_documento || null, pessoa_id || null, pessoa_tipo || null,
        observacoes || null, usuario_id
      ]);

      // Atualizar saldo da conta se foi pago
      if (status === 'PAGO' && conta_bancaria_id) {
        const valorMovimento = tipo === 'RECEITA' ? valor : -valor;
        await db.query(`
          UPDATE contas_bancarias 
          SET saldo_atual = saldo_atual + ?
          WHERE id = ?
        `, [valorMovimento, conta_bancaria_id]);
      }

      res.status(201).json({
        message: 'Lançamento criado com sucesso',
        id: result.insertId
      });

    } catch (error) {
      console.error('Erro ao criar lançamento:', error);
      res.status(500).json({ error: 'Erro ao criar lançamento' });
    }
  },

  /**
   * Atualizar lançamento financeiro
   * @route PUT /api/fluxo-caixa/lancamentos/:id
   */
  async atualizarLancamento(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Buscar lançamento atual
      const [lancamentos] = await db.query(
        'SELECT * FROM lancamentos_financeiros WHERE id = ?',
        [id]
      );

      if (lancamentos.length === 0) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }

      const lancamentoAtual = lancamentos[0];

      // Se mudar status para PAGO, atualizar saldo da conta
      if (updates.status === 'PAGO' && lancamentoAtual.status !== 'PAGO' && lancamentoAtual.conta_bancaria_id) {
        const valorMovimento = lancamentoAtual.tipo === 'RECEITA' ? lancamentoAtual.valor : -lancamentoAtual.valor;
        await db.query(`
          UPDATE contas_bancarias 
          SET saldo_atual = saldo_atual + ?
          WHERE id = ?
        `, [valorMovimento, lancamentoAtual.conta_bancaria_id]);
      }

      // Se mudar status de PAGO para outro, reverter saldo
      if (updates.status !== 'PAGO' && lancamentoAtual.status === 'PAGO' && lancamentoAtual.conta_bancaria_id) {
        const valorMovimento = lancamentoAtual.tipo === 'RECEITA' ? -lancamentoAtual.valor : lancamentoAtual.valor;
        await db.query(`
          UPDATE contas_bancarias 
          SET saldo_atual = saldo_atual + ?
          WHERE id = ?
        `, [valorMovimento, lancamentoAtual.conta_bancaria_id]);
      }

      // Atualizar lançamento
      const campos = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const valores = Object.values(updates);

      await db.query(`
        UPDATE lancamentos_financeiros 
        SET ${campos}
        WHERE id = ?
      `, [...valores, id]);

      res.json({ message: 'Lançamento atualizado com sucesso' });

    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar lançamento' });
    }
  },

  /**
   * Deletar lançamento
   * @route DELETE /api/fluxo-caixa/lancamentos/:id
   */
  async deletarLancamento(req, res) {
    try {
      const { id } = req.params;

      // Buscar lançamento
      const [lancamentos] = await db.query(
        'SELECT * FROM lancamentos_financeiros WHERE id = ?',
        [id]
      );

      if (lancamentos.length === 0) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }

      const lancamento = lancamentos[0];

      // Se estava pago, reverter saldo
      if (lancamento.status === 'PAGO' && lancamento.conta_bancaria_id) {
        const valorMovimento = lancamento.tipo === 'RECEITA' ? -lancamento.valor : lancamento.valor;
        await db.query(`
          UPDATE contas_bancarias 
          SET saldo_atual = saldo_atual + ?
          WHERE id = ?
        `, [valorMovimento, lancamento.conta_bancaria_id]);
      }

      // Deletar
      await db.query('DELETE FROM lancamentos_financeiros WHERE id = ?', [id]);

      res.json({ message: 'Lançamento deletado com sucesso' });

    } catch (error) {
      console.error('Erro ao deletar lançamento:', error);
      res.status(500).json({ error: 'Erro ao deletar lançamento' });
    }
  }
};

module.exports = FluxoCaixaController;
