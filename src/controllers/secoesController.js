const pool = require('../config/db');

exports.listar = async (req, res) => {
  try {
    const { departamento_id } = req.query;

    let query = `
      SELECT s.id, s.nome, s.departamento_id, d.nome as departamento_nome
      FROM secoes s
      LEFT JOIN departamentos d ON s.departamento_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (departamento_id) {
      query += ' AND s.departamento_id = ?';
      params.push(departamento_id);
    }

    query += ' ORDER BY s.nome ASC';

    const [secoes] = await pool.query(query, params);
    res.json(secoes);
  } catch (error) {
    console.error('Erro ao listar seções:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [secoes] = await pool.query(
      `SELECT s.id, s.nome, s.departamento_id, d.nome as departamento_nome
       FROM secoes s
       LEFT JOIN departamentos d ON s.departamento_id = d.id
       WHERE s.id = ?`,
      [id]
    );
    
    if (secoes.length === 0) {
      return res.status(404).json({ message: 'Seção não encontrada.' });
    }
    
    res.json(secoes[0]);
  } catch (error) {
    console.error('Erro ao buscar seção:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, departamento_id } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }

    const [result] = await pool.query(
      'INSERT INTO secoes (nome, departamento_id) VALUES (?, ?)',
      [nome.trim(), departamento_id || null]
    );

    res.status(201).json({
      id: result.insertId,
      nome: nome.trim(),
      departamento_id,
      message: 'Seção criada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao criar seção:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, departamento_id } = req.body;
    
    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }
    
    const [result] = await pool.query(
      'UPDATE secoes SET nome = ?, departamento_id = ? WHERE id = ?',
      [nome.trim(), departamento_id || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Seção não encontrada.' });
    }
    
    res.json({ message: 'Seção atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar seção:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se há produtos vinculados
    const [produtos] = await pool.query(
      'SELECT COUNT(*) as total FROM produtos WHERE categoria_id = ?',
      [id]
    );
    
    if (produtos[0].total > 0) {
      return res.status(400).json({ 
        message: 'Não é possível excluir. Existem produtos vinculados a esta seção.' 
      });
    }
    
    const [result] = await pool.query(
      'DELETE FROM secoes WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Seção não encontrada.' });
    }
    
    res.json({ message: 'Seção excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir seção:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
