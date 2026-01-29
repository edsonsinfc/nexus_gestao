const pool = require('../db');

const PlanosPagamentoController = {
  // Listar todos os planos de pagamento
  async listar(req, res) {
    try {
      const { tipo } = req.query; // 'vendas', 'compras' ou vazio para todos

      let whereClause = '';
      if (tipo === 'vendas') {
        whereClause = 'WHERE visivel_vendas = TRUE AND ativo = TRUE';
      } else if (tipo === 'compras') {
        whereClause = 'WHERE visivel_compras = TRUE AND ativo = TRUE';
      }

      const [planos] = await pool.query(`
        SELECT * FROM planos_pagamento
        ${whereClause}
        ORDER BY nome
      `);

      res.json({ success: true, planos });
    } catch (error) {
      console.error('Erro ao listar planos de pagamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao listar planos de pagamento' 
      });
    }
  },

  // Buscar plano por ID
  async buscar(req, res) {
    try {
      const { id } = req.params;

      const [planos] = await pool.query(
        'SELECT * FROM planos_pagamento WHERE id = ?',
        [id]
      );

      if (planos.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Plano de pagamento não encontrado' 
        });
      }

      res.json({ success: true, plano: planos[0] });
    } catch (error) {
      console.error('Erro ao buscar plano de pagamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar plano de pagamento' 
      });
    }
  },

  // Criar novo plano de pagamento
  async criar(req, res) {
    try {
      const {
        nome,
        codigo,
        parcelas,
        intervalo_dias,
        percentual_entrada,
        visivel_vendas,
        visivel_compras,
        ativo,
        observacoes
      } = req.body;

      // Validações
      if (!nome || !parcelas) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: nome, parcelas'
        });
      }

      if (!visivel_vendas && !visivel_compras) {
        return res.status(400).json({
          success: false,
          error: 'O plano deve estar visível em pelo menos uma área (Vendas ou Compras)'
        });
      }

      // Verificar se já existe plano com mesmo nome
      const [existente] = await pool.query(
        'SELECT id FROM planos_pagamento WHERE nome = ?',
        [nome]
      );

      if (existente.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Já existe um plano cadastrado com este nome'
        });
      }

      const [result] = await pool.query(`
        INSERT INTO planos_pagamento (
          nome, codigo, parcelas, intervalo_dias, percentual_entrada,
          visivel_vendas, visivel_compras, ativo, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nome,
        codigo || null,
        parcelas,
        intervalo_dias || 30,
        percentual_entrada || 0,
        visivel_vendas !== false,
        visivel_compras !== false,
        ativo !== false,
        observacoes || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Plano de pagamento cadastrado com sucesso',
        id: result.insertId
      });

    } catch (error) {
      console.error('Erro ao criar plano de pagamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar plano de pagamento' 
      });
    }
  },

  // Atualizar plano de pagamento
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        codigo,
        parcelas,
        intervalo_dias,
        percentual_entrada,
        visivel_vendas,
        visivel_compras,
        ativo,
        observacoes
      } = req.body;

      // Verificar se plano existe
      const [existente] = await pool.query(
        'SELECT id FROM planos_pagamento WHERE id = ?',
        [id]
      );

      if (existente.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plano de pagamento não encontrado'
        });
      }

      if (!visivel_vendas && !visivel_compras) {
        return res.status(400).json({
          success: false,
          error: 'O plano deve estar visível em pelo menos uma área (Vendas ou Compras)'
        });
      }

      // Verificar duplicidade de nome (exceto o próprio plano)
      const [duplicado] = await pool.query(
        'SELECT id FROM planos_pagamento WHERE nome = ? AND id != ?',
        [nome, id]
      );

      if (duplicado.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Já existe outro plano cadastrado com este nome'
        });
      }

      await pool.query(`
        UPDATE planos_pagamento SET
          nome = ?,
          codigo = ?,
          parcelas = ?,
          intervalo_dias = ?,
          percentual_entrada = ?,
          visivel_vendas = ?,
          visivel_compras = ?,
          ativo = ?,
          observacoes = ?
        WHERE id = ?
      `, [
        nome,
        codigo || null,
        parcelas,
        intervalo_dias || 30,
        percentual_entrada || 0,
        visivel_vendas !== false,
        visivel_compras !== false,
        ativo !== false,
        observacoes || null,
        id
      ]);

      res.json({
        success: true,
        message: 'Plano de pagamento atualizado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao atualizar plano de pagamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar plano de pagamento' 
      });
    }
  },

  // Excluir plano de pagamento
  async excluir(req, res) {
    try {
      const { id } = req.params;

      // Verificar se plano existe
      const [existente] = await pool.query(
        'SELECT id FROM planos_pagamento WHERE id = ?',
        [id]
      );

      if (existente.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plano de pagamento não encontrado'
        });
      }

      // Verificar se há contas a pagar vinculadas
      const [contasPagar] = await pool.query(
        'SELECT COUNT(*) as total FROM contas_pagar WHERE plano_pagamento_id = ?',
        [id]
      );

      // Verificar se há contas a receber vinculadas
      const [contasReceber] = await pool.query(
        'SELECT COUNT(*) as total FROM contas_receber WHERE plano_pagamento_id = ?',
        [id]
      );

      const totalVinculados = contasPagar[0].total + contasReceber[0].total;

      if (totalVinculados > 0) {
        return res.status(400).json({
          success: false,
          error: `Não é possível excluir este plano pois existem ${totalVinculados} lançamento(s) vinculado(s). Desative-o ao invés de excluir.`
        });
      }

      await pool.query('DELETE FROM planos_pagamento WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Plano de pagamento excluído com sucesso'
      });

    } catch (error) {
      console.error('Erro ao excluir plano de pagamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao excluir plano de pagamento' 
      });
    }
  }
};

module.exports = PlanosPagamentoController;
