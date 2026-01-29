const pool = require('../db');

class LancamentosFinanceirosController {
  // Listar lançamentos com filtros
  async listar(req, res) {
    try {
      const { 
        tipo, 
        categoria_id, 
        status, 
        data_inicio, 
        data_fim,
        pessoa_id,
        conciliado 
      } = req.query;
      
      let sql = `
        SELECT 
          l.*,
          c.nome as categoria_nome,
          c.codigo as categoria_codigo,
          c.tipo as categoria_tipo
        FROM lancamentos_financeiros l
        LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (tipo) {
        sql += ' AND l.tipo = ?';
        params.push(tipo);
      }
      
      if (categoria_id) {
        sql += ' AND l.categoria_id = ?';
        params.push(categoria_id);
      }
      
      if (status) {
        sql += ' AND l.status = ?';
        params.push(status);
      }
      
      if (data_inicio) {
        sql += ' AND l.data_lancamento >= ?';
        params.push(data_inicio);
      }
      
      if (data_fim) {
        sql += ' AND l.data_lancamento <= ?';
        params.push(data_fim);
      }
      
      if (pessoa_id) {
        sql += ' AND l.pessoa_id = ?';
        params.push(pessoa_id);
      }
      
      if (conciliado !== undefined) {
        sql += ' AND l.conciliado = ?';
        params.push(conciliado === 'true' ? 1 : 0);
      }
      
      sql += ' ORDER BY l.data_lancamento DESC, l.id DESC';
      
      const [lancamentos] = await pool.query(sql, params);
      
      // Calcular totais
      const totais = {
        receitas: 0,
        despesas: 0,
        saldo: 0
      };
      
      lancamentos.forEach(l => {
        if (l.status !== 'CANCELADO') {
          if (l.tipo === 'RECEITA') {
            totais.receitas += parseFloat(l.valor);
          } else if (l.tipo === 'DESPESA') {
            totais.despesas += parseFloat(l.valor);
          }
        }
      });
      
      totais.saldo = totais.receitas - totais.despesas;
      
      res.json({ lancamentos, totais });
    } catch (error) {
      console.error('Erro ao listar lançamentos:', error);
      res.status(500).json({ error: 'Erro ao listar lançamentos' });
    }
  }

  // Buscar lançamento específico
  async buscar(req, res) {
    try {
      const { id } = req.params;
      
      const [lancamentos] = await pool.query(
        `SELECT 
          l.*,
          c.nome as categoria_nome,
          c.codigo as categoria_codigo
        FROM lancamentos_financeiros l
        LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
        WHERE l.id = ?`,
        [id]
      );
      
      if (lancamentos.length === 0) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }
      
      res.json({ lancamento: lancamentos[0] });
    } catch (error) {
      console.error('Erro ao buscar lançamento:', error);
      res.status(500).json({ error: 'Erro ao buscar lançamento' });
    }
  }

  // Criar novo lançamento
  async criar(req, res) {
    try {
      const {
        tipo,
        categoria_id,
        descricao,
        valor,
        data_lancamento,
        data_vencimento,
        data_pagamento,
        status,
        forma_pagamento,
        numero_documento,
        pessoa_id,
        pessoa_tipo,
        observacoes
      } = req.body;
      
      // Validações
      if (!tipo || !descricao || !valor || !data_lancamento) {
        return res.status(400).json({ 
          error: 'Tipo, descrição, valor e data de lançamento são obrigatórios' 
        });
      }
      
      if (!['RECEITA', 'DESPESA', 'TRANSFERENCIA'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido' });
      }
      
      const [result] = await pool.query(
        `INSERT INTO lancamentos_financeiros 
         (tipo, categoria_id, descricao, valor, data_lancamento, 
          data_vencimento, data_pagamento, status, forma_pagamento, 
          numero_documento, pessoa_id, pessoa_tipo, observacoes, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tipo,
          categoria_id || null,
          descricao,
          valor,
          data_lancamento,
          data_vencimento || null,
          data_pagamento || null,
          status || 'PENDENTE',
          forma_pagamento || null,
          numero_documento || null,
          pessoa_id || null,
          pessoa_tipo || null,
          observacoes || null,
          req.user?.id || null
        ]
      );
      
      res.json({
        message: 'Lançamento criado com sucesso',
        id: result.insertId
      });
    } catch (error) {
      console.error('Erro ao criar lançamento:', error);
      res.status(500).json({ error: 'Erro ao criar lançamento' });
    }
  }

  // Atualizar lançamento
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        tipo,
        categoria_id,
        descricao,
        valor,
        data_lancamento,
        data_vencimento,
        data_pagamento,
        status,
        forma_pagamento,
        numero_documento,
        pessoa_id,
        pessoa_tipo,
        observacoes
      } = req.body;
      
      // Verificar se existe
      const [lancamentos] = await pool.query(
        'SELECT id FROM lancamentos_financeiros WHERE id = ?',
        [id]
      );
      
      if (lancamentos.length === 0) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }
      
      const updates = [];
      const params = [];
      
      if (tipo) {
        if (!['RECEITA', 'DESPESA', 'TRANSFERENCIA'].includes(tipo)) {
          return res.status(400).json({ error: 'Tipo inválido' });
        }
        updates.push('tipo = ?');
        params.push(tipo);
      }
      
      if (categoria_id !== undefined) {
        updates.push('categoria_id = ?');
        params.push(categoria_id);
      }
      
      if (descricao) {
        updates.push('descricao = ?');
        params.push(descricao);
      }
      
      if (valor !== undefined) {
        updates.push('valor = ?');
        params.push(valor);
      }
      
      if (data_lancamento) {
        updates.push('data_lancamento = ?');
        params.push(data_lancamento);
      }
      
      if (data_vencimento !== undefined) {
        updates.push('data_vencimento = ?');
        params.push(data_vencimento);
      }
      
      if (data_pagamento !== undefined) {
        updates.push('data_pagamento = ?');
        params.push(data_pagamento);
      }
      
      if (status) {
        updates.push('status = ?');
        params.push(status);
      }
      
      if (forma_pagamento !== undefined) {
        updates.push('forma_pagamento = ?');
        params.push(forma_pagamento);
      }
      
      if (numero_documento !== undefined) {
        updates.push('numero_documento = ?');
        params.push(numero_documento);
      }
      
      if (pessoa_id !== undefined) {
        updates.push('pessoa_id = ?');
        params.push(pessoa_id);
      }
      
      if (pessoa_tipo !== undefined) {
        updates.push('pessoa_tipo = ?');
        params.push(pessoa_tipo);
      }
      
      if (observacoes !== undefined) {
        updates.push('observacoes = ?');
        params.push(observacoes);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }
      
      params.push(id);
      
      await pool.query(
        `UPDATE lancamentos_financeiros SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
      res.json({ message: 'Lançamento atualizado com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar lançamento' });
    }
  }

  // Excluir lançamento
  async excluir(req, res) {
    try {
      const { id } = req.params;
      
      const [lancamentos] = await pool.query(
        'SELECT * FROM lancamentos_financeiros WHERE id = ?',
        [id]
      );
      
      if (lancamentos.length === 0) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }
      
      const lancamento = lancamentos[0];
      
      // Não permitir exclusão se já foi conciliado
      if (lancamento.conciliado) {
        return res.status(400).json({ 
          error: 'Não é possível excluir lançamento já conciliado' 
        });
      }
      
      await pool.query('DELETE FROM lancamentos_financeiros WHERE id = ?', [id]);
      
      res.json({ message: 'Lançamento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      res.status(500).json({ error: 'Erro ao excluir lançamento' });
    }
  }

  // Marcar como pago
  async marcarPago(req, res) {
    try {
      const { id } = req.params;
      const { data_pagamento, forma_pagamento } = req.body;
      
      const [result] = await pool.query(
        `UPDATE lancamentos_financeiros 
         SET status = 'PAGO', 
             data_pagamento = ?,
             forma_pagamento = COALESCE(?, forma_pagamento)
         WHERE id = ?`,
        [data_pagamento || new Date(), forma_pagamento, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Lançamento não encontrado' });
      }
      
      res.json({ message: 'Lançamento marcado como pago' });
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      res.status(500).json({ error: 'Erro ao marcar como pago' });
    }
  }

  // Cancelar lançamento
  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      
      const [result] = await pool.query(
        `UPDATE lancamentos_financeiros 
         SET status = 'CANCELADO',
             observacoes = CONCAT(COALESCE(observacoes, ''), '\nCancelado: ', ?)
         WHERE id = ? AND conciliado = FALSE`,
        [motivo || 'Sem motivo informado', id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(400).json({ 
          error: 'Lançamento não encontrado ou já está conciliado' 
        });
      }
      
      res.json({ message: 'Lançamento cancelado com sucesso' });
    } catch (error) {
      console.error('Erro ao cancelar lançamento:', error);
      res.status(500).json({ error: 'Erro ao cancelar lançamento' });
    }
  }
}

module.exports = new LancamentosFinanceirosController();
