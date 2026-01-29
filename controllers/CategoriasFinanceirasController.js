const pool = require('../db');

class CategoriasFinanceirasController {
  // Listar todas as categorias
  async listar(req, res) {
    try {
      const { tipo } = req.query;
      
      let sql = 'SELECT * FROM categorias_financeiras';
      const params = [];
      
      if (tipo) {
        sql += ' WHERE tipo = ?';
        params.push(tipo);
      }
      
      sql += ' ORDER BY tipo, codigo';
      
      const [categorias] = await pool.query(sql, params);
      
      res.json({ categorias });
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({ error: 'Erro ao listar categorias' });
    }
  }

  // Buscar uma categoria específica
  async buscar(req, res) {
    try {
      const { id } = req.params;
      
      const [categorias] = await pool.query(
        'SELECT * FROM categorias_financeiras WHERE id = ?',
        [id]
      );
      
      if (categorias.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
      
      res.json({ categoria: categorias[0] });
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  }

  // Criar nova categoria
  async criar(req, res) {
    try {
      const { codigo, nome, tipo, nivel, dre_grupo } = req.body;
      
      // Validações
      if (!codigo || !nome || !tipo) {
        return res.status(400).json({ error: 'Código, nome e tipo são obrigatórios' });
      }
      
      if (!['RECEITA', 'DESPESA', 'CUSTO'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido. Use RECEITA, DESPESA ou CUSTO' });
      }
      
      // Verificar se o código já existe
      const [existente] = await pool.query(
        'SELECT id FROM categorias_financeiras WHERE codigo = ?',
        [codigo]
      );
      
      if (existente.length > 0) {
        return res.status(400).json({ error: 'Já existe uma categoria com este código' });
      }
      
      const [result] = await pool.query(
        `INSERT INTO categorias_financeiras 
         (codigo, nome, tipo, nivel, dre_grupo) 
         VALUES (?, ?, ?, ?, ?)`,
        [codigo, nome, tipo, nivel || 1, dre_grupo || null]
      );
      
      res.json({
        message: 'Categoria criada com sucesso',
        id: result.insertId
      });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  // Atualizar categoria
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { codigo, nome, tipo, nivel, dre_grupo } = req.body;
      
      // Verificar se a categoria existe
      const [categorias] = await pool.query(
        'SELECT id FROM categorias_financeiras WHERE id = ?',
        [id]
      );
      
      if (categorias.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
      
      // Verificar se o novo código já existe em outra categoria
      if (codigo) {
        const [existente] = await pool.query(
          'SELECT id FROM categorias_financeiras WHERE codigo = ? AND id != ?',
          [codigo, id]
        );
        
        if (existente.length > 0) {
          return res.status(400).json({ error: 'Já existe outra categoria com este código' });
        }
      }
      
      const updates = [];
      const params = [];
      
      if (codigo) {
        updates.push('codigo = ?');
        params.push(codigo);
      }
      if (nome) {
        updates.push('nome = ?');
        params.push(nome);
      }
      if (tipo) {
        if (!['RECEITA', 'DESPESA', 'CUSTO'].includes(tipo)) {
          return res.status(400).json({ error: 'Tipo inválido' });
        }
        updates.push('tipo = ?');
        params.push(tipo);
      }
      if (nivel !== undefined) {
        updates.push('nivel = ?');
        params.push(nivel);
      }
      if (dre_grupo !== undefined) {
        updates.push('dre_grupo = ?');
        params.push(dre_grupo);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }
      
      params.push(id);
      
      await pool.query(
        `UPDATE categorias_financeiras SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
      res.json({ message: 'Categoria atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  // Excluir categoria
  async excluir(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se existe
      const [categorias] = await pool.query(
        'SELECT * FROM categorias_financeiras WHERE id = ?',
        [id]
      );
      
      if (categorias.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
      
      // Verificar se tem lançamentos vinculados
      const [lancamentos] = await pool.query(
        'SELECT COUNT(*) as total FROM lancamentos_financeiros WHERE categoria_id = ?',
        [id]
      );
      
      if (lancamentos[0].total > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir esta categoria pois existem lançamentos vinculados a ela',
          lancamentos: lancamentos[0].total
        });
      }
      
      await pool.query('DELETE FROM categorias_financeiras WHERE id = ?', [id]);
      
      res.json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
  }
}

module.exports = new CategoriasFinanceirasController();
