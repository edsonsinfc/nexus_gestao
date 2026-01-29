// src/controllers/vendedoresController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function gerarProximoCodigoVendedor(connection) {
  // Garante incremento numérico mesmo com códigos legados não numéricos
  const [rows] = await connection.query(`
    SELECT MAX(CAST(codigo AS UNSIGNED)) AS maxCodigo
    FROM vendedores
    WHERE codigo REGEXP '^[0-9]+$'
  `);

  const proximoValor = (rows[0]?.maxCodigo || 0) + 1;
  return String(proximoValor).padStart(3, '0');
}

// Listar vendedores
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
      whereConditions.push('(v.codigo LIKE ? OR v.nome LIKE ? OR v.cpf LIKE ? OR v.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro por status
    if (ativo !== null) {
      whereConditions.push('v.ativo = ?');
      params.push(ativo === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        v.id,
        v.codigo,
        v.nome,
        v.cpf,
        v.telefone,
        v.email,
        v.comissao_padrao,
        v.ativo,
        DATE_FORMAT(v.created_at, '%d/%m/%Y %H:%i') as created_at,
        DATE_FORMAT(v.updated_at, '%d/%m/%Y %H:%i') as updated_at,
        u.id as usuario_id
      FROM vendedores v
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      ${whereClause}
      ORDER BY v.nome
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [vendedores] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendedores v
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      vendedores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar vendedores:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar vendedor por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [vendedores] = await pool.query(`
      SELECT * FROM vendedores WHERE id = ?
    `, [id]);

    if (vendedores.length === 0) {
      return res.status(404).json({ message: 'Vendedor não encontrado.' });
    }

    res.json(vendedores[0]);

  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar novo vendedor
exports.criar = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      nome,
      cpf,
      telefone,
      email,
      endereco,
      comissao_padrao = 0,
      ativo = true,
      senha = '123456' // Senha padrão inicial
    } = req.body;

    const proximoCodigo = await gerarProximoCodigoVendedor(connection);

    // Verificar CPF se fornecido
    if (cpf) {
      const [existingDoc] = await connection.query('SELECT id FROM vendedores WHERE cpf = ?', [cpf]);
      if (existingDoc.length > 0) {
        return res.status(400).json({ message: 'CPF já cadastrado.' });
      }
    }

    // Validar email (obrigatório para criar usuário)
    if (!email || email.trim() === '') {
      await connection.rollback();
      return res.status(400).json({ message: 'Email é obrigatório para cadastrar vendedor.' });
    }

    // Verificar email
    const [existingEmail] = await connection.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Email já cadastrado.' });
    }

    // Criar usuário primeiro
    const hashedPassword = await bcrypt.hash(senha, 10);
    
    const [usuarioResult] = await connection.query(`
      INSERT INTO usuarios (
        nome, login, email, senha, perfil_id, ativo
      ) VALUES (?, ?, ?, ?, 2, ?)
    `, [nome, email, email, hashedPassword, ativo ? 1 : 0]);

    // Inserir vendedor com o ID do usuário
    const [result] = await connection.query(`
      INSERT INTO vendedores (
        codigo, nome, cpf, telefone, email, endereco, comissao_padrao, ativo, usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      proximoCodigo, nome, cpf, telefone, email, endereco, comissao_padrao, ativo ? 1 : 0, usuarioResult.insertId
    ]);

    await connection.commit();
    
    res.status(201).json({
      message: 'Vendedor criado com sucesso.',
      id: result.insertId,
      codigo: proximoCodigo,
      usuario_id: usuarioResult.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Erro ao criar vendedor:', error);
    console.error('❌ Stack:', error.stack);
    
    // Mensagens de erro mais específicas
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'CPF ou Email já cadastrado.' });
    }
    
    if (error.code === 'ER_NO_DEFAULT_FOR_FIELD') {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }
    
    res.status(500).json({ 
      message: 'Erro ao criar vendedor: ' + (error.message || 'Erro desconhecido'),
      details: error.code 
    });
  } finally {
    connection.release();
  }
};

// Atualizar vendedor
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      cpf,
      telefone,
      email,
      endereco,
      comissao_padrao,
      ativo
    } = req.body;

    // Verificar se vendedor existe
    const [existing] = await pool.query('SELECT id FROM vendedores WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Vendedor não encontrado.' });
    }

    // Verificar CPF se fornecido
    if (cpf) {
      const [existingDoc] = await pool.query('SELECT id FROM vendedores WHERE cpf = ? AND id != ?', [cpf, id]);
      if (existingDoc.length > 0) {
        return res.status(400).json({ message: 'CPF já cadastrado.' });
      }
    }

    await pool.query(`
      UPDATE vendedores SET
        nome = ?, cpf = ?, telefone = ?, email = ?, endereco = ?, 
        comissao_padrao = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      nome, cpf, telefone, email, endereco, comissao_padrao, ativo, id
    ]);

    res.json({ message: 'Vendedor atualizado com sucesso.' });

  } catch (error) {
    console.error('Erro ao atualizar vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Excluir vendedor
exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se vendedor existe
    const [existing] = await pool.query('SELECT id FROM vendedores WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Vendedor não encontrado.' });
    }

    // Verificar se vendedor tem vendas associadas
    const [vendas] = await pool.query('SELECT id FROM vendas WHERE vendedor_id = ?', [id]);

    if (vendas.length > 0) {
      return res.status(400).json({ message: 'Vendedor não pode ser excluído pois possui vendas associadas.' });
    }

    await pool.query('DELETE FROM vendedores WHERE id = ?', [id]);

    res.json({ message: 'Vendedor excluído com sucesso.' });

  } catch (error) {
    console.error('Erro ao excluir vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

