// src/controllers/clientesController.js
const pool = require('../config/db');

// Listar clientes com filtros
exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      tipo = null,
      vendedor_id = null,
      ativo = null 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por busca
    if (search) {
      whereConditions.push('(c.nome_razao_social LIKE ? OR c.nome_fantasia LIKE ? OR c.cpf_cnpj LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro por tipo
    if (tipo) {
      whereConditions.push('c.tipo_pessoa = ?');
      params.push(tipo);
    }

    // Filtro por vendedor
    if (vendedor_id) {
      whereConditions.push('c.vendedor_id = ?');
      params.push(vendedor_id);
    }

    // Filtro por status
    if (ativo !== null) {
      whereConditions.push('c.ativo = ?');
      params.push(ativo === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        c.*,
        v.nome as vendedor_nome
      FROM clientes c
      LEFT JOIN vendedores v ON c.vendedor_id = v.id
      ${whereClause}
      ORDER BY c.nome_razao_social
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [clientes] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes c
      LEFT JOIN vendedores v ON c.vendedor_id = v.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      clientes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar cliente por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [clientes] = await pool.query(`
      SELECT 
        c.*,
        v.nome as vendedor_nome
      FROM clientes c
      LEFT JOIN vendedores v ON c.vendedor_id = v.id
      WHERE c.id = ?
    `, [id]);

    if (clientes.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    res.json(clientes[0]);

  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar cliente por código ou CPF/CNPJ
exports.buscarPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    const [clientes] = await pool.query(`
      SELECT 
        c.*,
        v.nome as vendedor_nome
      FROM clientes c
      LEFT JOIN vendedores v ON c.vendedor_id = v.id
      WHERE c.id = ? OR c.cpf_cnpj = ?
    `, [codigo, codigo]);

    if (clientes.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    res.json(clientes[0]);

  } catch (error) {
    console.error('Erro ao buscar cliente por código:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar novo cliente
exports.criar = async (req, res) => {
  try {
    const {
      tipo,
      nome_razao_social,
      nome_fantasia,
      cpf_cnpj,
      telefone,
      email,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      vendedor_id,
      politica_precificacao_id = 1,
      observacoes,
      ativo = true
    } = req.body;

    console.log('Dados recebidos para criar cliente:', req.body);

    // Validar campos obrigatórios
    if (!nome_razao_social || !cpf_cnpj || !tipo) {
      return res.status(400).json({ 
        message: 'Nome/Razão Social, CPF/CNPJ e Tipo são obrigatórios.' 
      });
    }

    // Verificar CPF/CNPJ se fornecido
    if (cpf_cnpj) {
      const [existingDoc] = await pool.query('SELECT id, nome_razao_social FROM clientes WHERE cpf_cnpj = ?', [cpf_cnpj]);
      if (existingDoc.length > 0) {
        const clienteExistente = existingDoc[0];
        return res.status(400).json({ 
          message: `CPF/CNPJ ${cpf_cnpj} já cadastrado com ID ${clienteExistente.id} (${clienteExistente.nome_razao_social}).` 
        });
      }
    }

    const [result] = await pool.query(`
      INSERT INTO clientes (
        nome_razao_social, nome_fantasia, cpf_cnpj, tipo_pessoa, telefone, email,
        endereco, numero, complemento, bairro, cidade, estado, cep,
        vendedor_id, politica_precificacao_id, observacoes, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome_razao_social, nome_fantasia, cpf_cnpj, tipo, telefone, email,
      endereco, numero, complemento, bairro, cidade, estado, cep,
      vendedor_id || null, politica_precificacao_id, observacoes, ativo
    ]);

    console.log('Cliente criado com sucesso, ID:', result.insertId);

    res.status(201).json({
      message: 'Cliente criado com sucesso.',
      id: result.insertId
    });

  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Atualizar cliente
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo,
      nome_razao_social,
      nome_fantasia,
      cpf_cnpj,
      inscricao_estadual,
      telefone,
      email,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      vendedor_id,
      politica_precificacao_id,
      observacoes,
      ativo
    } = req.body;

    // Verificar se cliente existe
    const [existing] = await pool.query('SELECT id FROM clientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    // Verificar CPF/CNPJ se fornecido
    if (cpf_cnpj) {
      const [existingDoc] = await pool.query('SELECT id, nome_razao_social FROM clientes WHERE cpf_cnpj = ? AND id != ?', [cpf_cnpj, id]);
      if (existingDoc.length > 0) {
        const clienteExistente = existingDoc[0];
        return res.status(400).json({ 
          message: `CPF/CNPJ ${cpf_cnpj} já cadastrado com ID ${clienteExistente.id} (${clienteExistente.nome_razao_social}).` 
        });
      }
    }

    await pool.query(`
      UPDATE clientes SET
        tipo = ?, nome_razao_social = ?, nome_fantasia = ?, cpf_cnpj = ?,
        inscricao_estadual = ?, telefone = ?, email = ?, endereco = ?, numero = ?,
        complemento = ?, bairro = ?, cidade = ?, estado = ?, cep = ?, 
        vendedor_id = ?, politica_precificacao_id = ?, observacoes = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      tipo, nome_razao_social, nome_fantasia, cpf_cnpj, inscricao_estadual,
      telefone, email, endereco, numero, complemento, bairro, cidade, estado, cep, 
      vendedor_id, politica_precificacao_id, observacoes, ativo, id
    ]);

    res.json({ message: 'Cliente atualizado com sucesso.' });

  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Excluir cliente
exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se cliente existe
    const [existing] = await pool.query('SELECT id FROM clientes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    // Verificar se cliente tem pedidos ou vendas
    const [pedidos] = await pool.query('SELECT id FROM pedidos WHERE cliente_id = ?', [id]);
    const [vendas] = await pool.query('SELECT id FROM vendas WHERE cliente_id = ?', [id]);

    if (pedidos.length > 0 || vendas.length > 0) {
      return res.status(400).json({ message: 'Cliente não pode ser excluído pois possui pedidos ou vendas associados.' });
    }

    await pool.query('DELETE FROM clientes WHERE id = ?', [id]);

    res.json({ message: 'Cliente excluído com sucesso.' });

  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar histórico do cliente
exports.historico = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se cliente existe
    const [clientes] = await pool.query('SELECT id FROM clientes WHERE id = ?', [id]);
    if (clientes.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    // Buscar pedidos
    const [pedidos] = await pool.query(`
      SELECT 
        p.*,
        v.nome as vendedor_nome,
        'PEDIDO' as tipo_documento
      FROM pedidos p
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      WHERE p.cliente_id = ?
      ORDER BY p.data_pedido DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);

    // Buscar vendas
    const [vendas] = await pool.query(`
      SELECT 
        v.*,
        vd.nome as vendedor_nome,
        'VENDA' as tipo_documento
      FROM vendas v
      LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
      WHERE v.cliente_id = ?
      ORDER BY v.data_venda DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);

    // Combinar resultados e ordenar por data
    const historico = [...pedidos, ...vendas].sort((a, b) => {
      const dateA = new Date(a.data_pedido || a.data_venda);
      const dateB = new Date(b.data_pedido || b.data_venda);
      return dateB - dateA;
    });

    res.json({
      historico: historico.slice(0, parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: historico.length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar histórico do cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

