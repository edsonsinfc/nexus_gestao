// src/controllers/produtosController.js
const pool = require('../config/db');

// --- FUNÇÕES DE LEITURA ---

exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      categoria_id = null, 
      fornecedor_padrao_id = null,
      ativo = null 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(p.codigo_principal LIKE ? OR p.descricao LIKE ? OR p.gtin LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoria_id) {
      whereConditions.push('p.categoria_id = ?');
      params.push(categoria_id);
    }

    if (fornecedor_padrao_id) {
      whereConditions.push('p.fornecedor_padrao_id = ?');
      params.push(fornecedor_padrao_id);
    }

    if (ativo !== null) {
      whereConditions.push('p.ativo = ?');
      params.push(ativo === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.id, 
        p.codigo_principal, 
        p.descricao, 
        p.ativo,
        p.preco_custo,
        p.preco_venda,
        p.estoque_atual,
        p.gtin,
        p.ncm,
        p.unidade,
        s.nome AS categoria_nome,
        f.razao_social AS fornecedor_nome
      FROM produtos p
      LEFT JOIN secoes s ON p.categoria_id = s.id
      LEFT JOIN fornecedores f ON p.fornecedor_padrao_id = f.id
      ${whereClause}
      ORDER BY p.descricao
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));
    const [produtos] = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(p.id) as total
      FROM produtos p
      LEFT JOIN secoes s ON p.categoria_id = s.id
      LEFT JOIN fornecedores f ON p.fornecedor_padrao_id = f.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      produtos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [produtos] = await pool.query(`
      SELECT 
        p.*,
        s.nome as categoria_nome,
        s.departamento_id,
        f.razao_social as fornecedor_nome
      FROM produtos p
      LEFT JOIN secoes s ON p.categoria_id = s.id
      LEFT JOIN fornecedores f ON p.fornecedor_padrao_id = f.id
      WHERE p.id = ?
    `, [id]);

    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    res.json(produtos[0]);
  } catch (error) {
    console.error('Erro ao buscar produto por ID:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.buscarPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    const [produtos] = await pool.query(`
      SELECT 
        p.*,
        s.nome as categoria_nome,
        s.departamento_id,
        f.razao_social as fornecedor_nome
      FROM produtos p
      LEFT JOIN secoes s ON p.categoria_id = s.id
      LEFT JOIN fornecedores f ON p.fornecedor_padrao_id = f.id
      WHERE p.codigo_principal = ? OR p.gtin = ?
    `, [codigo, codigo]);

    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    res.json(produtos[0]);
  } catch (error) {
    console.error('Erro ao buscar produto por código:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};


// --- FUNÇÕES DE ESCRITA (CRIAR, ATUALIZAR, ETC.) ---

// Para as funções de criar e atualizar, a versão com TRANSAÇÃO que te enviei antes é a mais recomendada.
// Por enquanto, estas versões simples e corrigidas devem funcionar sem quebrar o servidor.

// src/controllers/produtosController.js

// src/controllers/produtosController.js

exports.criar = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      codigo_principal,
      descricao,
      unidade,
      categoria,
      gtin = null,
      fornecedor_padrao_id = null,
      ativo = true,
      preco_custo = 0,
      preco_venda = 0,
      estoque_inicial = 0
    } = req.body;

    const categoria_id = categoria ? parseInt(categoria) : null;

    if (!codigo_principal || !descricao || categoria_id === null) {
      connection.release();
      return res.status(400).json({ message: 'Código, Descrição e Categoria são obrigatórios.' });
    }

    await connection.beginTransaction();

    const [resultProduto] = await connection.query(
      'INSERT INTO produtos (codigo_principal, gtin, descricao, unidade, categoria_id, fornecedor_padrao_id, ativo, preco_venda) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [codigo_principal, gtin, descricao, unidade, categoria_id, fornecedor_padrao_id, ativo, preco_venda]
    );

    const novoProdutoId = resultProduto.insertId;

    // --- CORREÇÃO APLICADA AQUI ---
    await connection.query(
      'INSERT INTO estoque (produto_id, preco_custo, quantidade_atual) VALUES (?, ?, ?)',
      [novoProdutoId, preco_custo, estoque_inicial]
    );

    await connection.commit();

    res.status(201).json({ message: 'Produto criado com sucesso.', id: novoProdutoId });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  } finally {
    connection.release();
  }
};
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_principal, gtin, descricao, unidade, categoria_id, fornecedor_padrao_id, ativo, preco_venda
    } = req.body;

    await pool.query(
      'UPDATE produtos SET codigo_principal = ?, gtin = ?, descricao = ?, unidade = ?, categoria_id = ?, fornecedor_padrao_id = ?, ativo = ?, preco_venda = ? WHERE id = ?',
      [codigo_principal, gtin, descricao, unidade, categoria_id, fornecedor_padrao_id, ativo, preco_venda, id]
    );
    res.json({ message: 'Produto atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    // Adicionar lógicas de verificação (ex: se o produto tem estoque) antes de deletar.
    await pool.query('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Cole esta função no final do seu arquivo

exports.atualizarEstoque = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade, tipo, observacoes } = req.body;

    const qtd = parseFloat(quantidade);
    if (isNaN(qtd)) {
        return res.status(400).json({ message: 'Quantidade inválida.' });
    }

    const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [id]);
    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const [estoques] = await pool.query('SELECT * FROM estoque WHERE produto_id = ?', [id]);
    if (estoques.length === 0) {
        // Se não houver registro de estoque, crie um.
        await pool.query('INSERT INTO estoque (produto_id, quantidade_atual, quantidade_disponivel) VALUES (?, 0, 0)', [id]);
        // E busque novamente
        const [newEstoques] = await pool.query('SELECT * FROM estoque WHERE produto_id = ?', [id]);
        estoques[0] = newEstoques[0];
    }

    const estoque = estoques[0];
    const saldoAnterior = estoque.quantidade_atual;
    let saldoAtual;

    if (tipo === 'ENTRADA') {
      saldoAtual = saldoAnterior + qtd;
    } else if (tipo === 'SAIDA') {
      saldoAtual = saldoAnterior - qtd;
    } else if (tipo === 'AJUSTE') {
      saldoAtual = qtd;
    } else {
      return res.status(400).json({ message: 'Tipo de movimentação inválido.' });
    }

    if (saldoAtual < 0) {
      return res.status(400).json({ message: 'Estoque não pode ficar negativo.' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('UPDATE estoque SET quantidade_atual = ?, quantidade_disponivel = ? WHERE produto_id = ?', [saldoAtual, saldoAtual, id]);
      await connection.query(`
        INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, saldo_anterior, saldo_atual, observacoes) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, tipo, qtd, saldoAnterior, saldoAtual, observacoes]);

      await connection.commit();
      connection.release();

      res.json({ message: 'Estoque atualizado com sucesso.', saldoAtual });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};