const pool = require('../config/db');

exports.listar = async (req, res) => {
  try {
    const { departamento_id } = req.query;

    let query = `
      SELECT c.id, c.nome, c.departamento_id, c.ativo, d.nome as departamento_nome
      FROM categorias c
      LEFT JOIN departamentos d ON c.departamento_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (departamento_id) {
      query += ' AND c.departamento_id = ?';
      params.push(departamento_id);
    }

    query += ' ORDER BY c.nome ASC';

    const [categorias] = await pool.query(query, params);
    res.json(categorias);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [categorias] = await pool.query(
      `SELECT c.id, c.nome, c.departamento_id, c.ativo, d.nome as departamento_nome
       FROM categorias c
       LEFT JOIN departamentos d ON c.departamento_id = d.id
       WHERE c.id = ?`,
      [id]
    );
    
    if (categorias.length === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }
    
    res.json(categorias[0]);
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
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
      'INSERT INTO categorias (nome, departamento_id, ativo) VALUES (?, ?, 1)',
      [nome.trim(), departamento_id || null]
    );

    res.status(201).json({
      id: result.insertId,
      nome: nome.trim(),
      departamento_id,
      ativo: 1,
      message: 'Categoria criada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, departamento_id, ativo } = req.body;
    
    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }
    
    const [result] = await pool.query(
      'UPDATE categorias SET nome = ?, departamento_id = ?, ativo = ? WHERE id = ?',
      [nome.trim(), departamento_id || null, ativo ? 1 : 0, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }
    
    res.json({ message: 'Categoria atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query(
      'DELETE FROM categorias WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }
    
    res.json({ message: 'Categoria excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};