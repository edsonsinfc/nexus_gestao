const pool = require('../db');

const FormasPagamentoController = {
  // Listar todas as formas de pagamento
  async listar(req, res) {
    try {
      const { tipo, contexto } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (tipo) {
        whereClause += ' AND tipo = ?';
        params.push(tipo);
      }
      
      if (contexto === 'vendas') {
        whereClause += ' AND visivel_vendas = TRUE';
      } else if (contexto === 'compras') {
        whereClause += ' AND visivel_compras = TRUE';
      }
      
      const [formas] = await pool.query(`
        SELECT 
          f.*,
          cb.banco_nome,
          cb.agencia,
          cb.conta,
          (SELECT COUNT(*) FROM formas_pagamento_planos fpp WHERE fpp.forma_pagamento_id = f.id) as total_planos
        FROM formas_pagamento f
        LEFT JOIN contas_bancarias cb ON cb.id = f.conta_bancaria_id
        ${whereClause}
        ORDER BY f.nome
      `, params);
      
      res.json(formas);
    } catch (error) {
      console.error('Erro ao listar formas de pagamento:', error);
      res.status(500).json({ error: 'Erro ao listar formas de pagamento' });
    }
  },

  // Buscar uma forma de pagamento específica
  async buscar(req, res) {
    try {
      const { id } = req.params;
      
      const [formas] = await pool.query(`
        SELECT 
          f.*,
          cb.banco_nome,
          cb.agencia,
          cb.conta
        FROM formas_pagamento f
        LEFT JOIN contas_bancarias cb ON cb.id = f.conta_bancaria_id
        WHERE f.id = ?
      `, [id]);
      
      if (formas.length === 0) {
        return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
      }
      
      // Buscar planos vinculados
      const [planos] = await pool.query(`
        SELECT 
          p.*,
          fpp.taxa_adicional_percentual,
          fpp.taxa_adicional_fixa,
          fpp.ativo as vinculo_ativo
        FROM formas_pagamento_planos fpp
        JOIN planos_pagamento p ON p.id = fpp.plano_pagamento_id
        WHERE fpp.forma_pagamento_id = ?
        ORDER BY p.parcelas
      `, [id]);
      
      res.json({
        ...formas[0],
        planos_vinculados: planos
      });
    } catch (error) {
      console.error('Erro ao buscar forma de pagamento:', error);
      res.status(500).json({ error: 'Erro ao buscar forma de pagamento' });
    }
  },

  // Criar nova forma de pagamento
  async criar(req, res) {
    try {
      const {
        nome,
        codigo,
        tipo,
        permite_parcelamento,
        dias_compensacao,
        taxa_percentual,
        taxa_fixa,
        conta_bancaria_id,
        visivel_vendas,
        visivel_compras,
        observacoes
      } = req.body;

      // Validações
      if (!nome || !tipo) {
        return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
      }

      if (!visivel_vendas && !visivel_compras) {
        return res.status(400).json({ 
          error: 'A forma deve estar visível em pelo menos uma área (vendas ou compras)' 
        });
      }

      // Verificar duplicidade
      const [existe] = await pool.query(
        'SELECT id FROM formas_pagamento WHERE nome = ?',
        [nome]
      );

      if (existe.length > 0) {
        return res.status(400).json({ error: 'Já existe uma forma de pagamento com este nome' });
      }

      // Inserir
      const [result] = await pool.query(`
        INSERT INTO formas_pagamento 
        (nome, codigo, tipo, permite_parcelamento, dias_compensacao, taxa_percentual, taxa_fixa, 
         conta_bancaria_id, visivel_vendas, visivel_compras, observacoes, ativo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [
        nome, codigo, tipo, permite_parcelamento || false, dias_compensacao || 0,
        taxa_percentual || 0, taxa_fixa || 0, conta_bancaria_id || null,
        visivel_vendas !== false, visivel_compras !== false, observacoes
      ]);

      res.status(201).json({
        success: true,
        id: result.insertId,
        message: 'Forma de pagamento criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar forma de pagamento:', error);
      res.status(500).json({ error: 'Erro ao criar forma de pagamento' });
    }
  },

  // Atualizar forma de pagamento
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        codigo,
        tipo,
        permite_parcelamento,
        dias_compensacao,
        taxa_percentual,
        taxa_fixa,
        conta_bancaria_id,
        visivel_vendas,
        visivel_compras,
        ativo,
        observacoes
      } = req.body;

      // Validações
      if (!nome || !tipo) {
        return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
      }

      if (!visivel_vendas && !visivel_compras) {
        return res.status(400).json({ 
          error: 'A forma deve estar visível em pelo menos uma área (vendas ou compras)' 
        });
      }

      // Verificar duplicidade
      const [existe] = await pool.query(
        'SELECT id FROM formas_pagamento WHERE nome = ? AND id != ?',
        [nome, id]
      );

      if (existe.length > 0) {
        return res.status(400).json({ error: 'Já existe outra forma de pagamento com este nome' });
      }

      // Atualizar
      await pool.query(`
        UPDATE formas_pagamento SET
          nome = ?,
          codigo = ?,
          tipo = ?,
          permite_parcelamento = ?,
          dias_compensacao = ?,
          taxa_percentual = ?,
          taxa_fixa = ?,
          conta_bancaria_id = ?,
          visivel_vendas = ?,
          visivel_compras = ?,
          ativo = ?,
          observacoes = ?
        WHERE id = ?
      `, [
        nome, codigo, tipo, permite_parcelamento || false, dias_compensacao || 0,
        taxa_percentual || 0, taxa_fixa || 0, conta_bancaria_id || null,
        visivel_vendas !== false, visivel_compras !== false, ativo !== false,
        observacoes, id
      ]);

      res.json({
        success: true,
        message: 'Forma de pagamento atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar forma de pagamento' });
    }
  },

  // Excluir forma de pagamento
  async excluir(req, res) {
    try {
      const { id } = req.params;

      // Verificar se há vendas/compras usando esta forma
      const [vendas] = await pool.query(
        'SELECT COUNT(*) as total FROM vendas WHERE forma_pagamento_id = ?',
        [id]
      );

      const [compras] = await pool.query(
        'SELECT COUNT(*) as total FROM contas_pagar WHERE forma_pagamento_id = ?',
        [id]
      );

      const totalVinculados = (vendas[0]?.total || 0) + (compras[0]?.total || 0);

      if (totalVinculados > 0) {
        return res.status(400).json({
          error: `Não é possível excluir esta forma pois existem ${totalVinculados} lançamento(s) vinculado(s)`
        });
      }

      // Excluir relacionamentos primeiro
      await pool.query('DELETE FROM formas_pagamento_planos WHERE forma_pagamento_id = ?', [id]);

      // Excluir forma
      await pool.query('DELETE FROM formas_pagamento WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Forma de pagamento excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir forma de pagamento:', error);
      res.status(500).json({ error: 'Erro ao excluir forma de pagamento' });
    }
  },

  // Vincular planos à forma de pagamento
  async vincularPlanos(req, res) {
    try {
      const { id } = req.params;
      const { planos } = req.body; // Array de { plano_id, taxa_percentual, taxa_fixa }

      if (!Array.isArray(planos)) {
        return res.status(400).json({ error: 'Planos deve ser um array' });
      }

      // Remover vínculos antigos
      await pool.query('DELETE FROM formas_pagamento_planos WHERE forma_pagamento_id = ?', [id]);

      // Criar novos vínculos
      for (const plano of planos) {
        await pool.query(`
          INSERT INTO formas_pagamento_planos 
          (forma_pagamento_id, plano_pagamento_id, taxa_adicional_percentual, taxa_adicional_fixa, ativo)
          VALUES (?, ?, ?, ?, TRUE)
        `, [
          id,
          plano.plano_id,
          plano.taxa_percentual || 0,
          plano.taxa_fixa || 0
        ]);
      }

      res.json({
        success: true,
        message: `${planos.length} plano(s) vinculado(s) com sucesso`
      });
    } catch (error) {
      console.error('Erro ao vincular planos:', error);
      res.status(500).json({ error: 'Erro ao vincular planos' });
    }
  },

  // Buscar planos disponíveis para uma forma
  async planosDisponiveis(req, res) {
    try {
      const { id } = req.params;
      const { contexto } = req.query; // 'vendas' ou 'compras'

      let whereClause = 'WHERE p.ativo = TRUE';
      
      if (contexto === 'vendas') {
        whereClause += ' AND p.visivel_vendas = TRUE';
      } else if (contexto === 'compras') {
        whereClause += ' AND p.visivel_compras = TRUE';
      }

      const [planos] = await pool.query(`
        SELECT 
          p.*,
          CASE 
            WHEN fpp.id IS NOT NULL THEN TRUE 
            ELSE FALSE 
          END as vinculado,
          fpp.taxa_adicional_percentual,
          fpp.taxa_adicional_fixa
        FROM planos_pagamento p
        LEFT JOIN formas_pagamento_planos fpp ON fpp.plano_pagamento_id = p.id AND fpp.forma_pagamento_id = ?
        ${whereClause}
        ORDER BY p.parcelas, p.nome
      `, [id]);

      res.json(planos);
    } catch (error) {
      console.error('Erro ao buscar planos disponíveis:', error);
      res.status(500).json({ error: 'Erro ao buscar planos disponíveis' });
    }
  }
};

module.exports = FormasPagamentoController;
