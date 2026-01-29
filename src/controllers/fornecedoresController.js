// src/controllers/fornecedoresController.js
const pool = require('../config/db');

// Listar fornecedores com filtros
exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      ativo = null 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por busca
    if (search) {
      whereConditions.push('(codigo LIKE ? OR razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro por status
    if (ativo !== null) {
      whereConditions.push('ativo = ?');
      params.push(ativo === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT *
      FROM fornecedores
      ${whereClause}
      ORDER BY razao_social
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [fornecedores] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM fornecedores
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      fornecedores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar fornecedor por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [fornecedores] = await pool.query('SELECT * FROM fornecedores WHERE id = ?', [id]);

    if (fornecedores.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    res.json(fornecedores[0]);

  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar fornecedor por código ou CNPJ
exports.buscarPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    const [fornecedores] = await pool.query('SELECT * FROM fornecedores WHERE codigo = ? OR cnpj = ?', [codigo, codigo]);

    if (fornecedores.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    res.json(fornecedores[0]);

  } catch (error) {
    console.error('Erro ao buscar fornecedor por código:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar novo fornecedor
exports.criar = async (req, res) => {
  try {
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      inscricao_estadual,
      telefone,
      email,
      endereco,
      cidade,
      estado,
      cep,
      contato,
      ativo = true
    } = req.body;

    console.log('Dados recebidos para criar fornecedor:', req.body);

    // Validar campos obrigatórios
    if (!razao_social) {
      return res.status(400).json({ 
        message: 'Razão Social é obrigatória.' 
      });
    }

    // Verificar CNPJ se fornecido
    if (cnpj) {
      const [existingDoc] = await pool.query(`
        SELECT id, codigo, razao_social, nome_fantasia, cnpj 
        FROM fornecedores 
        WHERE cnpj = ?
      `, [cnpj]);

      if (existingDoc.length > 0) {
        const fornecedorExistente = existingDoc[0];
        return res.status(400).json({ 
          error: 'CNPJ_DUPLICADO',
          message: `CNPJ já cadastrado`,
          fornecedor_existente: {
            id: fornecedorExistente.id,
            codigo: fornecedorExistente.codigo,
            razao_social: fornecedorExistente.razao_social,
            nome_fantasia: fornecedorExistente.nome_fantasia,
            cnpj: fornecedorExistente.cnpj
          }
        });
      }
    }

    // Gerar código automático baseado em timestamp
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const proximoCodigo = `F${timestamp.toString().slice(-6)}${random}`;

    const [result] = await pool.query(`
      INSERT INTO fornecedores (
        codigo, razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, email,
        endereco, cidade, estado, cep, contato, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      proximoCodigo, 
      razao_social, 
      nome_fantasia, 
      cnpj, 
      inscricao_estadual, 
      telefone, 
      email,
      endereco, 
      cidade, 
      estado, 
      cep, 
      contato, 
      ativo === true || ativo === 'true' || ativo === 1 ? 1 : 0
    ]);

    console.log('Fornecedor criado com sucesso, ID:', result.insertId, 'Ativo:', ativo);

    res.status(201).json({
      message: 'Fornecedor criado com sucesso.',
      id: result.insertId,
      codigo: proximoCodigo
    });

  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Atualizar fornecedor
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      inscricao_estadual,
      telefone,
      email,
      endereco,
      cidade,
      estado,
      cep,
      contato,
      ativo
    } = req.body;

    // Verificar se fornecedor existe
    const [existing] = await pool.query('SELECT id FROM fornecedores WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    // Verificar CNPJ se fornecido
    if (cnpj) {
      const [existingDoc] = await pool.query(`
        SELECT id, codigo, razao_social, nome_fantasia, cnpj 
        FROM fornecedores 
        WHERE cnpj = ? AND id != ?
      `, [cnpj, id]);

      if (existingDoc.length > 0) {
        const fornecedorExistente = existingDoc[0];
        return res.status(400).json({ 
          error: 'CNPJ_DUPLICADO',
          message: `CNPJ já cadastrado`,
          fornecedor_existente: {
            id: fornecedorExistente.id,
            codigo: fornecedorExistente.codigo,
            razao_social: fornecedorExistente.razao_social,
            nome_fantasia: fornecedorExistente.nome_fantasia,
            cnpj: fornecedorExistente.cnpj
          }
        });
      }
    }

    await pool.query(`
      UPDATE fornecedores SET
        razao_social = ?, nome_fantasia = ?, cnpj = ?, inscricao_estadual = ?,
        telefone = ?, email = ?, endereco = ?, cidade = ?, estado = ?, cep = ?,
        contato = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      razao_social, 
      nome_fantasia, 
      cnpj, 
      inscricao_estadual,
      telefone, 
      email, 
      endereco, 
      cidade, 
      estado, 
      cep,
      contato, 
      ativo === true || ativo === 'true' || ativo === 1 ? 1 : 0, 
      id
    ]);

    console.log('Fornecedor atualizado:', id, 'Ativo:', ativo);

    res.json({ message: 'Fornecedor atualizado com sucesso.' });

  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Excluir fornecedor
exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se fornecedor existe
    const [existing] = await pool.query('SELECT id FROM fornecedores WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    // Verificar se fornecedor tem produtos associados
    const [produtos] = await pool.query('SELECT id FROM produtos WHERE fornecedor_id = ?', [id]);

    if (produtos.length > 0) {
      return res.status(400).json({ message: 'Fornecedor não pode ser excluído pois possui produtos associados.' });
    }

    await pool.query('DELETE FROM fornecedores WHERE id = ?', [id]);

    res.json({ message: 'Fornecedor excluído com sucesso.' });

  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

