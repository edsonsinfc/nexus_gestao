// src/controllers/pedidosController.js
const pool = require('../config/db');

// Listar pedidos
exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status = null,
      cliente_id = null,
      vendedor_id = null,
      data_inicio = null,
      data_fim = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por status
    if (status) {
      whereConditions.push('p.status = ?');
      params.push(status);
    }

    // Filtro por cliente
    if (cliente_id) {
      whereConditions.push('p.cliente_id = ?');
      params.push(cliente_id);
    }

    // Filtro por vendedor
    if (vendedor_id) {
      whereConditions.push('p.vendedor_id = ?');
      params.push(vendedor_id);
    }

    // Filtro por data
    if (data_inicio) {
      whereConditions.push('p.data_pedido >= ?');
      params.push(data_inicio);
    }

    if (data_fim) {
      whereConditions.push('p.data_pedido <= ?');
      params.push(data_fim);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        p.*,
        c.nome_razao_social as cliente_nome,
        v.nome as vendedor_nome,
        u.nome as usuario_nome
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [pedidos] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      pedidos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar pedido por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar pedido
    const [pedidos] = await pool.query(`
      SELECT 
        p.*,
        c.nome_razao_social as cliente_nome,
        v.nome as vendedor_nome,
        u.nome as usuario_nome
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (pedidos.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    // Buscar itens do pedido
    const [itens] = await pool.query(`
      SELECT 
        pi.*,
        p.codigo as produto_codigo,
        p.descricao as produto_descricao,
        p.unidade
      FROM pedido_itens pi
      LEFT JOIN produtos p ON pi.produto_id = p.id
      WHERE pi.pedido_id = ?
      ORDER BY p.descricao
    `, [id]);

    res.json({
      ...pedidos[0],
      itens
    });

  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar novo pedido
exports.criar = async (req, res) => {
  try {
    const {
      cliente_id,
      vendedor_id,
      data_pedido,
      data_entrega,
      observacoes,
      itens
    } = req.body;

    // Verificar se cliente existe
    const [clientes] = await pool.query('SELECT * FROM clientes WHERE id = ? AND ativo = 1', [cliente_id]);
    if (clientes.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    // Verificar se vendedor existe (se fornecido)
    if (vendedor_id) {
      const [vendedores] = await pool.query('SELECT id FROM vendedores WHERE id = ? AND ativo = 1', [vendedor_id]);
      if (vendedores.length === 0) {
        return res.status(404).json({ message: 'Vendedor não encontrado.' });
      }
    }

    // Gerar número do pedido
    const [ultimoPedido] = await pool.query('SELECT numero FROM pedidos ORDER BY id DESC LIMIT 1');
    const proximoNumero = ultimoPedido.length > 0 ? 
      `PED${String(parseInt(ultimoPedido[0].numero.replace('PED', '')) + 1).padStart(6, '0')}` : 
      'PED000001';

    // Calcular valores
    let valorTotal = 0;
    let desconto = 0;

    for (const item of itens) {
      const quantidade = parseFloat(item.quantidade);
      const precoUnitario = parseFloat(item.preco_unitario);
      const itemDesconto = parseFloat(item.desconto) || 0;
      
      const valorItem = (quantidade * precoUnitario) - itemDesconto;
      valorTotal += valorItem;
      desconto += itemDesconto;
    }

    const valorFinal = valorTotal;

    // Iniciar transação
    await pool.query('START TRANSACTION');

    try {
      // Criar pedido
      const [result] = await pool.query(`
        INSERT INTO pedidos (
          numero, cliente_id, vendedor_id, data_pedido, data_entrega,
          valor_total, desconto, valor_final, observacoes, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        proximoNumero, cliente_id, vendedor_id, data_pedido, data_entrega,
        valorTotal, desconto, valorFinal, observacoes, req.user.id
      ]);

      const pedidoId = result.insertId;

      // Criar itens do pedido
      for (const item of itens) {
        // Verificar se produto existe e tem estoque
        const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ? AND ativo = 1', [item.produto_id]);
        if (produtos.length === 0) {
          throw new Error(`Produto ID ${item.produto_id} não encontrado ou inativo`);
        }

        const produto = produtos[0];
        const quantidade = parseFloat(item.quantidade);
        const precoUnitario = parseFloat(item.preco_unitario);
        const itemDesconto = parseFloat(item.desconto) || 0;
        const valorTotalItem = (quantidade * precoUnitario) - itemDesconto;

        // Verificar estoque disponível
        if (produto.estoque_atual < quantidade) {
          throw new Error(`Estoque insuficiente para o produto ${produto.descricao}. Disponível: ${produto.estoque_atual}`);
        }

        // Criar item do pedido
        await pool.query(`
          INSERT INTO pedido_itens (
            pedido_id, produto_id, quantidade, preco_unitario, desconto, valor_total
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [pedidoId, item.produto_id, quantidade, precoUnitario, itemDesconto, valorTotalItem]);
      }

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Pedido criado com sucesso.',
        id: pedidoId,
        numero: proximoNumero
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Atualizar status do pedido
exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = ['ABERTO', 'FATURADO', 'CANCELADO', 'ENTREGUE'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ message: 'Status inválido.' });
    }

    // Verificar se pedido existe
    const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (pedidos.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const pedido = pedidos[0];

    // Se faturado, baixar estoque
    if (status === 'FATURADO' && pedido.status !== 'FATURADO') {
      await pool.query('START TRANSACTION');

      try {
        // Buscar itens do pedido
        const [itens] = await pool.query('SELECT * FROM pedido_itens WHERE pedido_id = ?', [id]);

        // Baixar estoque de cada item
        for (const item of itens) {
          const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [item.produto_id]);
          if (produtos.length > 0) {
            const produto = produtos[0];
            const novoEstoque = produto.estoque_atual - parseFloat(item.quantidade);
            
            if (novoEstoque < 0) {
              throw new Error(`Estoque insuficiente para faturar pedido do produto ${produto.descricao}`);
            }

            await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);

            // Registrar movimentação de estoque
            await pool.query(`
              INSERT INTO movimentacoes_estoque (
                produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
                documento, observacoes, usuario_id
              ) VALUES (?, 'SAIDA', ?, ?, ?, ?, ?, ?)
            `, [
              item.produto_id, item.quantidade, produto.estoque_atual, novoEstoque,
              pedido.numero, `Faturamento de pedido - ${pedido.numero}`, req.user.id
            ]);
          }
        }

        await pool.query('COMMIT');
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    // Atualizar status
    await pool.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);

    res.json({ message: 'Status atualizado com sucesso.' });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Excluir pedido (apenas se aberto)
exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se pedido existe e está aberto
    const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (pedidos.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const pedido = pedidos[0];
    if (pedido.status !== 'ABERTO') {
      return res.status(400).json({ message: 'Apenas pedidos abertos podem ser excluídos.' });
    }

    await pool.query('DELETE FROM pedidos WHERE id = ?', [id]);

    res.json({ message: 'Pedido excluído com sucesso.' });

  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

