// src/controllers/estoqueController.js
const pool = require('../config/db');

// Listar movimentações de estoque
exports.listarMovimentacoes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      produto_id = null,
      tipo = null,
      data_inicio = null,
      data_fim = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por produto
    if (produto_id) {
      whereConditions.push('me.produto_id = ?');
      params.push(produto_id);
    }

    // Filtro por tipo
    if (tipo) {
      whereConditions.push('me.tipo = ?');
      params.push(tipo);
    }

    // Filtro por data
    if (data_inicio) {
      whereConditions.push('DATE(me.created_at) >= ?');
      params.push(data_inicio);
    }

    if (data_fim) {
      whereConditions.push('DATE(me.created_at) <= ?');
      params.push(data_fim);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        me.*,
        p.codigo as produto_codigo,
        p.descricao as produto_descricao,
        u.nome as usuario_nome
      FROM movimentacoes_estoque me
      LEFT JOIN produtos p ON me.produto_id = p.id
      LEFT JOIN usuarios u ON me.usuario_id = u.id
      ${whereClause}
      ORDER BY me.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [movimentacoes] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM movimentacoes_estoque me
      LEFT JOIN produtos p ON me.produto_id = p.id
      LEFT JOIN usuarios u ON me.usuario_id = u.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      movimentacoes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar movimentação de estoque
exports.criarMovimentacao = async (req, res) => {
  try {
    const {
      produto_id,
      tipo,
      quantidade,
      observacoes,
      documento
    } = req.body;

    // Buscar produto atual
    const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [produto_id]);
    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const produto = produtos[0];
    const saldoAnterior = produto.estoque_atual;
    let saldoAtual;

    // Calcular novo saldo
    if (tipo === 'ENTRADA') {
      saldoAtual = saldoAnterior + parseFloat(quantidade);
    } else if (tipo === 'SAIDA') {
      saldoAtual = saldoAnterior - parseFloat(quantidade);
    } else if (tipo === 'AJUSTE') {
      saldoAtual = parseFloat(quantidade);
    } else {
      return res.status(400).json({ message: 'Tipo de movimentação inválido.' });
    }

    // Verificar estoque negativo
    if (saldoAtual < 0) {
      return res.status(400).json({ message: 'Estoque não pode ficar negativo.' });
    }

    // Iniciar transação
    await pool.query('START TRANSACTION');

    try {
      // Atualizar estoque do produto
      await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [saldoAtual, produto_id]);

      // Registrar movimentação
      const [result] = await pool.query(`
        INSERT INTO movimentacoes_estoque (
          produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
          documento, observacoes, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [produto_id, tipo, quantidade, saldoAnterior, saldoAtual, documento, observacoes, req.user.id]);

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Movimentação registrada com sucesso.',
        id: result.insertId,
        saldoAnterior,
        saldoAtual,
        movimentacao: quantidade
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Listar produtos com estoque baixo
exports.listarEstoqueBaixo = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        p.*,
        c.nome as categoria_nome,
        f.razao_social as fornecedor_nome,
        (p.estoque_atual - p.estoque_minimo) as diferenca_estoque
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      WHERE p.ativo = 1 AND p.estoque_atual <= p.estoque_minimo
      ORDER BY (p.estoque_atual - p.estoque_minimo) ASC
      LIMIT ? OFFSET ?
    `;

    const [produtos] = await pool.query(query, [parseInt(limit), parseInt(offset)]);

    // Contar total
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM produtos p
      WHERE p.ativo = 1 AND p.estoque_atual <= p.estoque_minimo
    `);
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
    console.error('Erro ao listar estoque baixo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Relatório de estoque
exports.relatorioEstoque = async (req, res) => {
  try {
    console.log('📊 Relatório de estoque - Iniciando...');
    const { categoria_id = null, fornecedor_id = null } = req.query;
    let whereConditions = ['p.ativo = 1'];
    let params = [];

    if (categoria_id) {
      whereConditions.push('p.categoria_id = ?');
      params.push(categoria_id);
    }

    if (fornecedor_id) {
      whereConditions.push('p.fornecedor_id = ?');
      params.push(fornecedor_id);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        p.id,
        p.codigo,
        p.descricao,
        p.unidade,
        p.estoque_atual,
        p.estoque_minimo,
        p.preco_custo,
        p.preco_venda,
        (p.estoque_atual * p.preco_custo) as valor_estoque_custo,
        (p.estoque_atual * p.preco_venda) as valor_estoque_venda,
        c.nome as categoria_nome,
        f.razao_social as fornecedor_nome,
        CASE 
          WHEN p.estoque_atual <= p.estoque_minimo THEN 'BAIXO'
          WHEN p.estoque_atual <= (p.estoque_minimo * 1.5) THEN 'ATENÇÃO'
          ELSE 'NORMAL'
        END as status_estoque
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      ${whereClause}
      ORDER BY p.descricao
    `;

    const [produtos] = await pool.query(query, params);

    // Calcular totais
    const totais = produtos.reduce((acc, produto) => {
      acc.total_produtos += 1;
      acc.valor_total_custo += parseFloat(produto.valor_estoque_custo) || 0;
      acc.valor_total_venda += parseFloat(produto.valor_estoque_venda) || 0;
      acc.estoque_baixo += produto.status_estoque === 'BAIXO' ? 1 : 0;
      acc.estoque_atencao += produto.status_estoque === 'ATENÇÃO' ? 1 : 0;
      return acc;
    }, {
      total_produtos: 0,
      valor_total_custo: 0,
      valor_total_venda: 0,
      estoque_baixo: 0,
      estoque_atencao: 0
    });

    res.json({
      produtos,
      totais
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de estoque:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
