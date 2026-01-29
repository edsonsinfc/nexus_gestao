// src/controllers/entradaMercadoriasController.js
const pool = require('../config/db');

// Listar entradas de mercadorias
exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status = null,
      fornecedor_id = null,
      data_inicio = null,
      data_fim = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por status
    if (status) {
      whereConditions.push('em.status = ?');
      params.push(status);
    }

    // Filtro por fornecedor
    if (fornecedor_id) {
      whereConditions.push('em.fornecedor_id = ?');
      params.push(fornecedor_id);
    }

    // Filtro por data
    if (data_inicio) {
      whereConditions.push('em.data_entrada >= ?');
      params.push(data_inicio);
    }

    if (data_fim) {
      whereConditions.push('em.data_entrada <= ?');
      params.push(data_fim);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        em.*,
        f.razao_social as fornecedor_nome,
        u.nome as usuario_nome
      FROM entrada_mercadorias em
      LEFT JOIN fornecedores f ON em.fornecedor_id = f.id
      LEFT JOIN usuarios u ON em.usuario_id = u.id
      ${whereClause}
      ORDER BY em.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [entradas] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM entrada_mercadorias em
      LEFT JOIN fornecedores f ON em.fornecedor_id = f.id
      LEFT JOIN usuarios u ON em.usuario_id = u.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      entradas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar entradas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar entrada por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar entrada
    const [entradas] = await pool.query(`
      SELECT 
        em.*,
        f.razao_social as fornecedor_nome,
        u.nome as usuario_nome
      FROM entrada_mercadorias em
      LEFT JOIN fornecedores f ON em.fornecedor_id = f.id
      LEFT JOIN usuarios u ON em.usuario_id = u.id
      WHERE em.id = ?
    `, [id]);

    if (entradas.length === 0) {
      return res.status(404).json({ message: 'Entrada não encontrada.' });
    }

    // Buscar itens da entrada
    const [itens] = await pool.query(`
      SELECT 
        emi.*,
        p.codigo as produto_codigo,
        p.descricao as produto_descricao,
        p.unidade
      FROM entrada_mercadorias_itens emi
      LEFT JOIN produtos p ON emi.produto_id = p.id
      WHERE emi.entrada_id = ?
      ORDER BY p.descricao
    `, [id]);

    res.json({
      ...entradas[0],
      itens
    });

  } catch (error) {
    console.error('Erro ao buscar entrada:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar nova entrada
exports.criar = async (req, res) => {
  try {
    const {
      fornecedor_id,
      data_entrada,
      observacoes,
      itens
    } = req.body;

    // Verificar se fornecedor existe
    const [fornecedores] = await pool.query('SELECT id FROM fornecedores WHERE id = ?', [fornecedor_id]);
    if (fornecedores.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    // Gerar número da entrada
    const [ultimaEntrada] = await pool.query('SELECT numero FROM entrada_mercadorias ORDER BY id DESC LIMIT 1');
    const proximoNumero = ultimaEntrada.length > 0 ? 
      `ENT${String(parseInt(ultimaEntrada[0].numero.replace('ENT', '')) + 1).padStart(6, '0')}` : 
      'ENT000001';

    // Calcular valor total
    const valorTotal = itens.reduce((total, item) => {
      return total + (parseFloat(item.quantidade) * parseFloat(item.preco_custo));
    }, 0);

    // Iniciar transação
    await pool.query('START TRANSACTION');

    try {
      // Criar entrada
      const [result] = await pool.query(`
        INSERT INTO entrada_mercadorias (
          numero, fornecedor_id, data_entrada, valor_total, observacoes, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [proximoNumero, fornecedor_id, data_entrada, valorTotal, observacoes, req.user.id]);

      const entradaId = result.insertId;

      // Criar itens e atualizar estoque
      for (const item of itens) {
        // Verificar se produto existe
        const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [item.produto_id]);
        if (produtos.length === 0) {
          throw new Error(`Produto ID ${item.produto_id} não encontrado`);
        }

        const produto = produtos[0];
        const quantidade = parseFloat(item.quantidade);
        const precoCusto = parseFloat(item.preco_custo);
        const valorTotalItem = quantidade * precoCusto;

        // Criar item da entrada
        await pool.query(`
          INSERT INTO entrada_mercadorias_itens (
            entrada_id, produto_id, quantidade, preco_custo, valor_total, lote, validade
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          entradaId, item.produto_id, quantidade, precoCusto, valorTotalItem,
          item.lote || null, item.validade || null
        ]);

        // Atualizar estoque do produto
        const novoEstoque = produto.estoque_atual + quantidade;
        await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);

        // Registrar movimentação de estoque
        await pool.query(`
          INSERT INTO movimentacoes_estoque (
            produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
            documento, observacoes, usuario_id
          ) VALUES (?, 'ENTRADA', ?, ?, ?, ?, ?, ?)
        `, [
          item.produto_id, quantidade, produto.estoque_atual, novoEstoque,
          proximoNumero, `Entrada de mercadorias - ${proximoNumero}`, req.user.id
        ]);
      }

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Entrada de mercadorias criada com sucesso.',
        id: entradaId,
        numero: proximoNumero
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao criar entrada:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Atualizar status da entrada
exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = ['PENDENTE', 'RECEBIDO', 'CANCELADO'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ message: 'Status inválido.' });
    }

    // Verificar se entrada existe
    const [entradas] = await pool.query('SELECT * FROM entrada_mercadorias WHERE id = ?', [id]);
    if (entradas.length === 0) {
      return res.status(404).json({ message: 'Entrada não encontrada.' });
    }

    const entrada = entradas[0];

    // Se cancelando, reverter movimentações de estoque
    if (status === 'CANCELADO' && entrada.status !== 'CANCELADO') {
      await pool.query('START TRANSACTION');

      try {
        // Buscar itens da entrada
        const [itens] = await pool.query('SELECT * FROM entrada_mercadorias_itens WHERE entrada_id = ?', [id]);

        // Reverter estoque de cada item
        for (const item of itens) {
          const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [item.produto_id]);
          if (produtos.length > 0) {
            const produto = produtos[0];
            const novoEstoque = produto.estoque_atual - parseFloat(item.quantidade);
            
            if (novoEstoque < 0) {
              throw new Error(`Estoque insuficiente para cancelar entrada do produto ${produto.descricao}`);
            }

            await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);

            // Registrar movimentação de reversão
            await pool.query(`
              INSERT INTO movimentacoes_estoque (
                produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
                documento, observacoes, usuario_id
              ) VALUES (?, 'SAIDA', ?, ?, ?, ?, ?, ?)
            `, [
              item.produto_id, item.quantidade, produto.estoque_atual, novoEstoque,
              entrada.numero, `Cancelamento de entrada - ${entrada.numero}`, req.user.id
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
    await pool.query('UPDATE entrada_mercadorias SET status = ? WHERE id = ?', [status, id]);

    res.json({ message: 'Status atualizado com sucesso.' });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Excluir entrada (apenas se pendente)
exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se entrada existe e está pendente
    const [entradas] = await pool.query('SELECT * FROM entrada_mercadorias WHERE id = ?', [id]);
    if (entradas.length === 0) {
      return res.status(404).json({ message: 'Entrada não encontrada.' });
    }

    const entrada = entradas[0];
    if (entrada.status !== 'PENDENTE') {
      return res.status(400).json({ message: 'Apenas entradas pendentes podem ser excluídas.' });
    }

    await pool.query('DELETE FROM entrada_mercadorias WHERE id = ?', [id]);

    res.json({ message: 'Entrada excluída com sucesso.' });

  } catch (error) {
    console.error('Erro ao excluir entrada:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

