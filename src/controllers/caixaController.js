// src/controllers/caixaController.js
const pool = require('../config/db');

// Listar caixas
exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por status
    if (status) {
      whereConditions.push('c.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        c.*,
        u.nome as usuario_responsavel_nome
      FROM caixas c
      LEFT JOIN usuarios u ON c.usuario_responsavel = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [caixas] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM caixas c
      LEFT JOIN usuarios u ON c.usuario_responsavel = u.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      caixas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar caixas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar caixa por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [caixas] = await pool.query(`
      SELECT 
        c.*,
        u.nome as usuario_responsavel_nome
      FROM caixas c
      LEFT JOIN usuarios u ON c.usuario_responsavel = u.id
      WHERE c.id = ?
    `, [id]);

    if (caixas.length === 0) {
      return res.status(404).json({ message: 'Caixa não encontrado.' });
    }

    res.json(caixas[0]);

  } catch (error) {
    console.error('Erro ao buscar caixa:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Abrir caixa
exports.abrir = async (req, res) => {
  try {
    const { numero, descricao, valor_inicial } = req.body;

    // Verificar se número já existe
    const [existing] = await pool.query('SELECT id FROM caixas WHERE numero = ?', [numero]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Número do caixa já existe.' });
    }

    // Verificar se usuário já tem caixa aberto
    const [caixaAberto] = await pool.query('SELECT id FROM caixas WHERE usuario_responsavel = ? AND status = "ABERTO"', [req.user.id]);
    if (caixaAberto.length > 0) {
      return res.status(400).json({ message: 'Usuário já possui um caixa aberto.' });
    }

    const [result] = await pool.query(`
      INSERT INTO caixas (
        numero, descricao, valor_inicial, valor_atual, status, 
        usuario_responsavel, data_abertura
      ) VALUES (?, ?, ?, ?, 'ABERTO', ?, NOW())
    `, [numero, descricao, valor_inicial, valor_inicial, req.user.id]);

    // Registrar movimentação de abertura
    await pool.query(`
      INSERT INTO movimentacoes_caixa (
        caixa_id, tipo, valor, descricao, usuario_id
      ) VALUES (?, 'ABERTURA', ?, 'Abertura do caixa', ?)
    `, [result.insertId, valor_inicial, req.user.id]);

    res.status(201).json({
      message: 'Caixa aberto com sucesso.',
      id: result.insertId
    });

  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Fechar caixa
exports.fechar = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    // Verificar se caixa existe e está aberto
    const [caixas] = await pool.query('SELECT * FROM caixas WHERE id = ? AND status = "ABERTO"', [id]);
    if (caixas.length === 0) {
      return res.status(404).json({ message: 'Caixa não encontrado ou já fechado.' });
    }

    const caixa = caixas[0];

    // Verificar se usuário tem permissão para fechar este caixa
    if (caixa.usuario_responsavel !== req.user.id) {
      return res.status(403).json({ message: 'Usuário não tem permissão para fechar este caixa.' });
    }

    // Calcular total de vendas do caixa
    const [vendas] = await pool.query(`
      SELECT 
        COUNT(*) as total_vendas,
        COALESCE(SUM(valor_final), 0) as total_vendas_valor
      FROM vendas 
      WHERE caixa_id = ? AND status = 'FINALIZADA'
    `, [id]);

    const totalVendas = vendas[0];

    // Calcular movimentações do caixa
    const [movimentacoes] = await pool.query(`
      SELECT 
        tipo,
        SUM(valor) as total
      FROM movimentacoes_caixa 
      WHERE caixa_id = ?
      GROUP BY tipo
    `, [id]);

    const resumo = {
      valor_inicial: parseFloat(caixa.valor_inicial),
      valor_atual: parseFloat(caixa.valor_atual),
      total_vendas: parseInt(totalVendas.total_vendas),
      total_vendas_valor: parseFloat(totalVendas.total_vendas_valor),
      movimentacoes: movimentacoes.reduce((acc, mov) => {
        acc[mov.tipo] = parseFloat(mov.total);
        return acc;
      }, {})
    };

    // Fechar caixa
    await pool.query(`
      UPDATE caixas 
      SET status = 'FECHADO', data_fechamento = NOW(), observacoes = ?
      WHERE id = ?
    `, [observacoes, id]);

    // Registrar movimentação de fechamento
    await pool.query(`
      INSERT INTO movimentacoes_caixa (
        caixa_id, tipo, valor, descricao, usuario_id
      ) VALUES (?, 'FECHAMENTO', ?, 'Fechamento do caixa', ?)
    `, [id, caixa.valor_atual, req.user.id]);

    res.json({
      message: 'Caixa fechado com sucesso.',
      resumo
    });

  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Listar movimentações do caixa
exports.movimentacoes = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se caixa existe
    const [caixas] = await pool.query('SELECT id FROM caixas WHERE id = ?', [id]);
    if (caixas.length === 0) {
      return res.status(404).json({ message: 'Caixa não encontrado.' });
    }

    const [movimentacoes] = await pool.query(`
      SELECT 
        mc.*,
        u.nome as usuario_nome
      FROM movimentacoes_caixa mc
      LEFT JOIN usuarios u ON mc.usuario_id = u.id
      WHERE mc.caixa_id = ?
      ORDER BY mc.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);

    // Contar total
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM movimentacoes_caixa WHERE caixa_id = ?', [id]);
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

// Relatório de caixa
exports.relatorio = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se caixa existe
    const [caixas] = await pool.query('SELECT * FROM caixas WHERE id = ?', [id]);
    if (caixas.length === 0) {
      return res.status(404).json({ message: 'Caixa não encontrado.' });
    }

    const caixa = caixas[0];

    // Buscar vendas do caixa
    const [vendas] = await pool.query(`
      SELECT 
        v.*,
        c.nome_razao_social as cliente_nome,
        vd.nome as vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
      WHERE v.caixa_id = ?
      ORDER BY v.data_venda
    `, [id]);

    // Buscar movimentações
    const [movimentacoes] = await pool.query(`
      SELECT 
        mc.*,
        u.nome as usuario_nome
      FROM movimentacoes_caixa mc
      LEFT JOIN usuarios u ON mc.usuario_id = u.id
      WHERE mc.caixa_id = ?
      ORDER BY mc.created_at
    `, [id]);

    // Calcular totais por forma de pagamento
    const totaisFormaPagamento = vendas.reduce((acc, venda) => {
      const forma = venda.forma_pagamento;
      if (!acc[forma]) {
        acc[forma] = { quantidade: 0, valor: 0 };
      }
      acc[forma].quantidade += 1;
      acc[forma].valor += parseFloat(venda.valor_final);
      return acc;
    }, {});

    // Calcular totais gerais
    const totais = {
      valor_inicial: parseFloat(caixa.valor_inicial),
      valor_atual: parseFloat(caixa.valor_atual),
      total_vendas: vendas.length,
      total_vendas_valor: vendas.reduce((acc, venda) => acc + parseFloat(venda.valor_final), 0),
      total_entradas: movimentacoes.filter(m => m.tipo === 'ENTRADA').reduce((acc, m) => acc + parseFloat(m.valor), 0),
      total_saidas: movimentacoes.filter(m => m.tipo === 'SAIDA').reduce((acc, m) => acc + parseFloat(m.valor), 0),
      formas_pagamento: totaisFormaPagamento
    };

    res.json({
      caixa,
      vendas,
      movimentacoes,
      totais
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de caixa:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

