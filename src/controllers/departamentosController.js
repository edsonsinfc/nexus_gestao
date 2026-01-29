const pool = require('../config/db');

exports.listar = async (req, res) => {
  try {
    const [departamentos] = await pool.query(
      'SELECT id, nome, ativo FROM departamentos ORDER BY nome ASC'
    );
    res.json(departamentos);
  } catch (error) {
    console.error('Erro ao listar departamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [departamentos] = await pool.query(
      'SELECT id, nome, ativo FROM departamentos WHERE id = ?',
      [id]
    );
    
    if (departamentos.length === 0) {
      return res.status(404).json({ message: 'Departamento não encontrado.' });
    }
    
    res.json(departamentos[0]);
  } catch (error) {
    console.error('Erro ao buscar departamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome } = req.body;
    
    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO departamentos (nome, ativo) VALUES (?, 1)',
      [nome.trim()]
    );
    
    res.status(201).json({
      id: result.insertId,
      nome: nome.trim(),
      ativo: 1,
      message: 'Departamento criado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao criar departamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, ativo } = req.body;
    
    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }
    
    const [result] = await pool.query(
      'UPDATE departamentos SET nome = ?, ativo = ? WHERE id = ?',
      [nome.trim(), ativo ? 1 : 0, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Departamento não encontrado.' });
    }
    
    res.json({ message: 'Departamento atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar departamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se há seções vinculadas
    const [secoes] = await pool.query(
      'SELECT COUNT(*) as total FROM secoes WHERE departamento_id = ?',
      [id]
    );
    
    if (secoes[0].total > 0) {
      return res.status(400).json({ 
        message: 'Não é possível excluir. Existem seções vinculadas a este departamento.' 
      });
    }
    
    const [result] = await pool.query(
      'DELETE FROM departamentos WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Departamento não encontrado.' });
    }
    
    res.json({ message: 'Departamento excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir departamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};