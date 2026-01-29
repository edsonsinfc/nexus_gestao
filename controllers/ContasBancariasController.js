const pool = require('../db');

const ContasBancariasController = {
  // Listar todas as contas bancárias
  async listar(req, res) {
    try {
      const [contas] = await pool.query(`
        SELECT * FROM contas_bancarias
        ORDER BY banco_nome, agencia, conta
      `);

      res.json({ success: true, contas });
    } catch (error) {
      console.error('Erro ao listar contas bancárias:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao listar contas bancárias' 
      });
    }
  },

  // Buscar conta por ID
  async buscar(req, res) {
    try {
      const { id } = req.params;

      const [contas] = await pool.query(
        'SELECT * FROM contas_bancarias WHERE id = ?',
        [id]
      );

      if (contas.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conta bancária não encontrada' 
        });
      }

      res.json({ success: true, conta: contas[0] });
    } catch (error) {
      console.error('Erro ao buscar conta bancária:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar conta bancária' 
      });
    }
  },

  // Criar nova conta bancária
  async criar(req, res) {
    try {
      const {
        banco_codigo,
        banco_nome,
        agencia,
        agencia_digito,
        conta,
        conta_digito,
        tipo_conta,
        saldo_inicial,
        saldo_atual,
        data_saldo_inicial,
        ativa,
        observacoes
      } = req.body;

      // Validações
      if (!banco_codigo || !banco_nome || !agencia || !conta || !tipo_conta) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: banco_codigo, banco_nome, agencia, conta, tipo_conta'
        });
      }

      // Verificar se já existe conta com mesma agência e número
      const [existente] = await pool.query(
        'SELECT id FROM contas_bancarias WHERE banco_codigo = ? AND agencia = ? AND conta = ?',
        [banco_codigo, agencia, conta]
      );

      if (existente.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Já existe uma conta cadastrada com esta agência e número'
        });
      }

      const [result] = await pool.query(`
        INSERT INTO contas_bancarias (
          banco_codigo, banco_nome, agencia, agencia_digito, conta, conta_digito,
          tipo_conta, saldo_inicial, saldo_atual, data_saldo_inicial, ativa, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        banco_codigo,
        banco_nome,
        agencia,
        agencia_digito || null,
        conta,
        conta_digito || null,
        tipo_conta,
        saldo_inicial || 0,
        saldo_atual || 0,
        data_saldo_inicial || null,
        ativa !== false,
        observacoes || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Conta bancária cadastrada com sucesso',
        id: result.insertId
      });

    } catch (error) {
      console.error('Erro ao criar conta bancária:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar conta bancária' 
      });
    }
  },

  // Atualizar conta bancária
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        banco_codigo,
        banco_nome,
        agencia,
        agencia_digito,
        conta,
        conta_digito,
        tipo_conta,
        saldo_inicial,
        saldo_atual,
        data_saldo_inicial,
        ativa,
        observacoes
      } = req.body;

      // Verificar se conta existe
      const [existente] = await pool.query(
        'SELECT id FROM contas_bancarias WHERE id = ?',
        [id]
      );

      if (existente.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conta bancária não encontrada'
        });
      }

      // Verificar duplicidade (exceto a própria conta)
      const [duplicada] = await pool.query(
        'SELECT id FROM contas_bancarias WHERE banco_codigo = ? AND agencia = ? AND conta = ? AND id != ?',
        [banco_codigo, agencia, conta, id]
      );

      if (duplicada.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Já existe outra conta cadastrada com esta agência e número'
        });
      }

      await pool.query(`
        UPDATE contas_bancarias SET
          banco_codigo = ?,
          banco_nome = ?,
          agencia = ?,
          agencia_digito = ?,
          conta = ?,
          conta_digito = ?,
          tipo_conta = ?,
          saldo_inicial = ?,
          saldo_atual = ?,
          data_saldo_inicial = ?,
          ativa = ?,
          observacoes = ?
        WHERE id = ?
      `, [
        banco_codigo,
        banco_nome,
        agencia,
        agencia_digito || null,
        conta,
        conta_digito || null,
        tipo_conta,
        saldo_inicial || 0,
        saldo_atual || 0,
        data_saldo_inicial || null,
        ativa !== false,
        observacoes || null,
        id
      ]);

      res.json({
        success: true,
        message: 'Conta bancária atualizada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao atualizar conta bancária:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar conta bancária' 
      });
    }
  },

  // Excluir conta bancária
  async excluir(req, res) {
    try {
      const { id } = req.params;

      // Verificar se conta existe
      const [existente] = await pool.query(
        'SELECT id FROM contas_bancarias WHERE id = ?',
        [id]
      );

      if (existente.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conta bancária não encontrada'
        });
      }

      // Verificar se há lançamentos vinculados
      const [lancamentos] = await pool.query(
        'SELECT COUNT(*) as total FROM lancamentos_financeiros WHERE conta_bancaria_id = ?',
        [id]
      );

      if (lancamentos[0].total > 0) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível excluir esta conta pois existem lançamentos vinculados. Desative-a ao invés de excluir.'
        });
      }

      await pool.query('DELETE FROM contas_bancarias WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Conta bancária excluída com sucesso'
      });

    } catch (error) {
      console.error('Erro ao excluir conta bancária:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao excluir conta bancária' 
      });
    }
  }
};

module.exports = ContasBancariasController;
