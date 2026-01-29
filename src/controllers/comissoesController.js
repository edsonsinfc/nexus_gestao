// src/controllers/comissoesController.js
const pool = require('../config/db');

// Listar regras de comissão
exports.listarRegras = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      tipo = null,
      vendedor_id = null,
      ativo = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por tipo
    if (tipo) {
      whereConditions.push('cr.tipo = ?');
      params.push(tipo);
    }

    // Filtro por vendedor
    if (vendedor_id) {
      whereConditions.push('cr.vendedor_id = ?');
      params.push(vendedor_id);
    }

    // Filtro por status ativo
    if (ativo !== null) {
      whereConditions.push('cr.ativo = ?');
      params.push(ativo === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        cr.*,
        v.nome as vendedor_nome,
        p.descricao as produto_descricao,
        f.razao_social as fornecedor_nome,
        c.nome as categoria_nome
      FROM comissao_regras cr
      LEFT JOIN vendedores v ON cr.vendedor_id = v.id
      LEFT JOIN produtos p ON cr.tipo = 'PRODUTO' AND cr.referencia_id = p.id
      LEFT JOIN fornecedores f ON cr.tipo = 'FORNECEDOR' AND cr.referencia_id = f.id
      LEFT JOIN categorias c ON cr.tipo = 'CATEGORIA' AND cr.referencia_id = c.id
      ${whereClause}
      ORDER BY cr.tipo, cr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [regras] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comissao_regras cr
      LEFT JOIN vendedores v ON cr.vendedor_id = v.id
      LEFT JOIN produtos p ON cr.tipo = 'PRODUTO' AND cr.referencia_id = p.id
      LEFT JOIN fornecedores f ON cr.tipo = 'FORNECEDOR' AND cr.referencia_id = f.id
      LEFT JOIN categorias c ON cr.tipo = 'CATEGORIA' AND cr.referencia_id = c.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      regras,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar regras de comissão:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar regra de comissão
exports.criarRegra = async (req, res) => {
  try {
    const {
      tipo,
      referencia_id,
      vendedor_id,
      tipo_comissao,
      valor,
      data_inicio,
      data_fim,
      ativo = true
    } = req.body;

    // Validar tipo
    const tiposValidos = ['PRODUTO', 'FORNECEDOR', 'CATEGORIA', 'GLOBAL'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de regra inválido.' });
    }

    // Validar referência se não for global
    if (tipo !== 'GLOBAL' && !referencia_id) {
      return res.status(400).json({ message: 'Referência é obrigatória para este tipo de regra.' });
    }

    // Verificar se vendedor existe (se fornecido)
    if (vendedor_id) {
      const [vendedores] = await pool.query('SELECT id FROM vendedores WHERE id = ? AND ativo = 1', [vendedor_id]);
      if (vendedores.length === 0) {
        return res.status(404).json({ message: 'Vendedor não encontrado.' });
      }
    }

    // Verificar se referência existe
    if (tipo !== 'GLOBAL') {
      let tabelaReferencia = '';
      switch (tipo) {
        case 'PRODUTO':
          tabelaReferencia = 'produtos';
          break;
        case 'FORNECEDOR':
          tabelaReferencia = 'fornecedores';
          break;
        case 'CATEGORIA':
          tabelaReferencia = 'categorias';
          break;
      }

      const [referencias] = await pool.query(`SELECT id FROM ${tabelaReferencia} WHERE id = ?`, [referencia_id]);
      if (referencias.length === 0) {
        return res.status(404).json({ message: 'Referência não encontrada.' });
      }
    }

    // Verificar conflito de regras
    const [conflitos] = await pool.query(`
      SELECT id FROM comissao_regras 
      WHERE tipo = ? AND referencia_id = ? AND vendedor_id = ? 
      AND ativo = 1 AND (data_fim IS NULL OR data_fim >= ?)
    `, [tipo, referencia_id, vendedor_id, data_inicio]);

    if (conflitos.length > 0) {
      return res.status(400).json({ message: 'Já existe uma regra ativa para esta combinação.' });
    }

    const [result] = await pool.query(`
      INSERT INTO comissao_regras (
        tipo, referencia_id, vendedor_id, tipo_comissao, valor, 
        data_inicio, data_fim, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [tipo, referencia_id, vendedor_id, tipo_comissao, valor, data_inicio, data_fim, ativo]);

    res.status(201).json({
      message: 'Regra de comissão criada com sucesso.',
      id: result.insertId
    });

  } catch (error) {
    console.error('Erro ao criar regra de comissão:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Calcular comissões de uma venda
exports.calcularComissoes = async (req, res) => {
  try {
    const { venda_id } = req.params;

    // Buscar venda e itens
    const [vendas] = await pool.query(`
      SELECT v.*, vd.id as vendedor_id
      FROM vendas v
      LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
      WHERE v.id = ?
    `, [venda_id]);

    if (vendas.length === 0) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }

    const venda = vendas[0];

    if (!venda.vendedor_id) {
      return res.status(400).json({ message: 'Venda não possui vendedor associado.' });
    }

    // Buscar itens da venda
    const [itens] = await pool.query(`
      SELECT vi.*, p.fornecedor_id, p.categoria_id
      FROM venda_itens vi
      LEFT JOIN produtos p ON vi.produto_id = p.id
      WHERE vi.venda_id = ?
    `, [venda_id]);

    // Remover comissões existentes desta venda
    await pool.query('DELETE FROM comissoes_venda WHERE venda_id = ?', [venda_id]);

    const comissoesCalculadas = [];

    // Calcular comissão para cada item
    for (const item of itens) {
      const comissao = await calcularComissaoItem(item, venda.vendedor_id);
      
      if (comissao) {
        // Inserir comissão calculada
        await pool.query(`
          INSERT INTO comissoes_venda (
            venda_id, vendedor_id, produto_id, quantidade, valor_venda,
            regra_id, tipo_comissao, percentual, valor_fixo, valor_comissao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          venda_id, venda.vendedor_id, item.produto_id, item.quantidade, item.valor_total,
          comissao.regra_id, comissao.tipo_comissao, comissao.percentual, comissao.valor_fixo, comissao.valor_comissao
        ]);

        comissoesCalculadas.push(comissao);
      }
    }

    res.json({
      message: 'Comissões calculadas com sucesso.',
      comissoes: comissoesCalculadas
    });

  } catch (error) {
    console.error('Erro ao calcular comissões:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Função auxiliar para calcular comissão de um item
async function calcularComissaoItem(item, vendedorId) {
  const { produto_id, quantidade, valor_total, fornecedor_id, categoria_id } = item;

  // Buscar regras de comissão em ordem de prioridade
  const [regras] = await pool.query(`
    SELECT * FROM comissao_regras 
    WHERE ativo = 1 
    AND (vendedor_id = ? OR vendedor_id IS NULL)
    AND (data_fim IS NULL OR data_fim >= CURDATE())
    AND (
      (tipo = 'PRODUTO' AND referencia_id = ?) OR
      (tipo = 'FORNECEDOR' AND referencia_id = ?) OR
      (tipo = 'CATEGORIA' AND referencia_id = ?) OR
      (tipo = 'GLOBAL')
    )
    ORDER BY 
      CASE tipo 
        WHEN 'PRODUTO' THEN 1
        WHEN 'FORNECEDOR' THEN 2
        WHEN 'CATEGORIA' THEN 3
        WHEN 'GLOBAL' THEN 4
      END,
      vendedor_id IS NOT NULL DESC
  `, [vendedorId, produto_id, fornecedor_id, categoria_id]);

  if (regras.length === 0) {
    return null;
  }

  const regra = regras[0];
  let valorComissao = 0;

  if (regra.tipo_comissao === 'PERCENTUAL') {
    valorComissao = (parseFloat(valor_total) * parseFloat(regra.valor)) / 100;
  } else if (regra.tipo_comissao === 'VALOR_FIXO') {
    valorComissao = parseFloat(regra.valor) * parseFloat(quantidade);
  }

  return {
    regra_id: regra.id,
    tipo_comissao: regra.tipo_comissao,
    percentual: regra.tipo_comissao === 'PERCENTUAL' ? regra.valor : null,
    valor_fixo: regra.tipo_comissao === 'VALOR_FIXO' ? regra.valor : null,
    valor_comissao: valorComissao
  };
}

// Listar comissões por vendedor
exports.listarComissoes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      vendedor_id = null,
      data_inicio = null,
      data_fim = null,
      pago = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por vendedor
    if (vendedor_id) {
      whereConditions.push('cv.vendedor_id = ?');
      params.push(vendedor_id);
    }

    // Filtro por data
    if (data_inicio) {
      whereConditions.push('DATE(v.data_venda) >= ?');
      params.push(data_inicio);
    }

    if (data_fim) {
      whereConditions.push('DATE(v.data_venda) <= ?');
      params.push(data_fim);
    }

    // Filtro por status de pagamento
    if (pago !== null) {
      whereConditions.push('cv.pago = ?');
      params.push(pago === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        cv.*,
        v.numero as venda_numero,
        v.data_venda,
        vd.nome as vendedor_nome,
        p.codigo as produto_codigo,
        p.descricao as produto_descricao,
        c.nome_razao_social as cliente_nome
      FROM comissoes_venda cv
      LEFT JOIN vendas v ON cv.venda_id = v.id
      LEFT JOIN vendedores vd ON cv.vendedor_id = vd.id
      LEFT JOIN produtos p ON cv.produto_id = p.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${whereClause}
      ORDER BY v.data_venda DESC, cv.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [comissoes] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comissoes_venda cv
      LEFT JOIN vendas v ON cv.venda_id = v.id
      LEFT JOIN vendedores vd ON cv.vendedor_id = vd.id
      LEFT JOIN produtos p ON cv.produto_id = p.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    // Calcular totais
    const totais = comissoes.reduce((acc, comissao) => {
      acc.total_comissoes += parseFloat(comissao.valor_comissao) || 0;
      acc.total_pago += comissao.pago ? (parseFloat(comissao.valor_comissao) || 0) : 0;
      acc.total_pendente += !comissao.pago ? (parseFloat(comissao.valor_comissao) || 0) : 0;
      return acc;
    }, {
      total_comissoes: 0,
      total_pago: 0,
      total_pendente: 0
    });

    res.json({
      comissoes,
      totais,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Marcar comissões como pagas
exports.marcarComoPago = async (req, res) => {
  try {
    const { ids, data_pagamento } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Lista de IDs é obrigatória.' });
    }

    await pool.query(`
      UPDATE comissoes_venda 
      SET pago = 1, data_pagamento = ? 
      WHERE id IN (${ids.map(() => '?').join(',')})
    `, [data_pagamento || new Date(), ...ids]);

    res.json({ message: 'Comissões marcadas como pagas com sucesso.' });

  } catch (error) {
    console.error('Erro ao marcar comissões como pagas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Relatório de comissões por vendedor
exports.relatorioVendedor = async (req, res) => {
  try {
    const { vendedor_id, data_inicio, data_fim } = req.query;

    if (!vendedor_id) {
      return res.status(400).json({ message: 'ID do vendedor é obrigatório.' });
    }

    let whereConditions = ['cv.vendedor_id = ?'];
    let params = [vendedor_id];

    if (data_inicio) {
      whereConditions.push('DATE(v.data_venda) >= ?');
      params.push(data_inicio);
    }

    if (data_fim) {
      whereConditions.push('DATE(v.data_venda) <= ?');
      params.push(data_fim);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Buscar dados do vendedor
    const [vendedores] = await pool.query('SELECT * FROM vendedores WHERE id = ?', [vendedor_id]);
    if (vendedores.length === 0) {
      return res.status(404).json({ message: 'Vendedor não encontrado.' });
    }

    // Buscar comissões
    const [comissoes] = await pool.query(`
      SELECT 
        cv.*,
        v.numero as venda_numero,
        v.data_venda,
        p.descricao as produto_descricao,
        c.nome_razao_social as cliente_nome
      FROM comissoes_venda cv
      LEFT JOIN vendas v ON cv.venda_id = v.id
      LEFT JOIN produtos p ON cv.produto_id = p.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${whereClause}
      ORDER BY v.data_venda DESC
    `, params);

    // Calcular totais
    const totais = comissoes.reduce((acc, comissao) => {
      acc.total_comissoes += parseFloat(comissao.valor_comissao) || 0;
      acc.total_pago += comissao.pago ? (parseFloat(comissao.valor_comissao) || 0) : 0;
      acc.total_pendente += !comissao.pago ? (parseFloat(comissao.valor_comissao) || 0) : 0;
      acc.total_vendas += 1;
      return acc;
    }, {
      total_comissoes: 0,
      total_pago: 0,
      total_pendente: 0,
      total_vendas: 0
    });

    res.json({
      vendedor: vendedores[0],
      comissoes,
      totais,
      periodo: {
        data_inicio: data_inicio || null,
        data_fim: data_fim || null
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de vendedor:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

