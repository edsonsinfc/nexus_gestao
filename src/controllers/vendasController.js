// src/controllers/vendasController.js
const pool = require('../config/db');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');

// Buscar produtos ativos
exports.buscarProdutosAtivos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.id,
                p.codigo_principal,
                p.gtin,
                p.descricao,
                p.unidade,
                COALESCE(p.preco_venda, 0.00) as preco_venda,
                COALESCE(p.estoque_atual, 0.00) as estoque_atual,
                p.ativo,
                c.nome as categoria,
                f.razao_social as fornecedor
            FROM produtos AS p
            LEFT JOIN categorias AS c ON p.categoria_id = c.id
            LEFT JOIN fornecedores AS f ON p.fornecedor_padrao_id = f.id
            ORDER BY p.descricao
        `);

    const ativos = rows.filter(produto => registroEstaAtivo(produto.ativo));

    console.log('📦 Produtos retornados da consulta:', rows.length);
    console.log('✅ Produtos ativos encontrados:', ativos.length);
    res.json(ativos);
    } catch (error) {
        console.error('❌ Erro ao buscar produtos ativos:', error);
        res.status(500).json({ error: error.message });
    }
};

// Buscar clientes ativos
exports.buscarClientesAtivos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                c.id,
                c.nome_razao_social,
                c.cpf_cnpj,
                v.nome as vendedor_nome
            FROM clientes c
            LEFT JOIN vendedores v ON c.vendedor_id = v.id
            WHERE c.ativo = true
            ORDER BY c.nome_razao_social
        `);
        
        console.log('✅ Clientes ativos encontrados:', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('❌ Erro ao buscar clientes ativos:', error);
        res.status(500).json({ error: error.message });
    }
};

// Buscar vendedores ativos
exports.buscarVendedoresAtivos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                id,
                nome,
                cpf,
                telefone,
                email,
                comissao_padrao
            FROM vendedores
            WHERE ativo = true
            ORDER BY nome
        `);
        
        console.log('✅ Vendedores ativos encontrados:', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('❌ Erro ao buscar vendedores ativos:', error);
        res.status(500).json({ error: error.message });
    }
};

// Função para criar tabelas
exports.criarTabelas = async (req, res) => {
  try {
    console.log('🏗️ Iniciando criação das tabelas de vendas...');
    
    const scriptPath = path.join(__dirname, '../../scripts/create_vendas_tables.sql');
    const sqlScript = await fs.readFile(scriptPath, 'utf8');
    
    // Dividir o script em comandos individuais e executar um por um
    const commands = sqlScript.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await pool.query(command);
          console.log('✅ Comando executado com sucesso');
        } catch (err) {
          if (err.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️ Tabela já existe, continuando...');
          } else {
            throw err;
          }
        }
      }
    }
    
    console.log('✅ Tabelas de vendas criadas com sucesso!');
    res.json({ message: 'Tabelas de vendas criadas com sucesso!' });
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    res.status(500).json({ error: error.message });
  }
};

// Funções de apoio
exports.buscarCondicoesPagamento = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM condicoes_pagamento WHERE ativo = true');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar condições de pagamento:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.buscarFormasPagamento = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM formas_pagamento WHERE ativo = true');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar formas de pagamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// Constantes
const STATUS = {
  ABERTO: 'ABERTO',
  PARCIALMENTE_ENTREGUE: 'PARCIALMENTE_ENTREGUE',
  ENTREGUE: 'ENTREGUE',
  FATURADO: 'FATURADO',
  CANCELADO: 'CANCELADO',
  PENDENTE_FINANCEIRO: 'PENDENTE_FINANCEIRO'
};

const TIPO_VENDA = {
  FISCAL: 'FISCAL',
  NAO_FISCAL: 'NAO_FISCAL'
};

// Listar vendas
exports.listar = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status = null,
      cliente_id = null,
      vendedor_id = null,
      caixa_id = null,
      data_inicio = null,
      data_fim = null,
      offline = null
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por status
    if (status) {
      whereConditions.push('v.status = ?');
      params.push(status);
    }

    // Filtro por cliente
    if (cliente_id) {
      whereConditions.push('v.cliente_id = ?');
      params.push(cliente_id);
    }

    // Filtro por vendedor
    if (vendedor_id) {
      whereConditions.push('v.vendedor_id = ?');
      params.push(vendedor_id);
    }

    // Filtro por caixa
    if (caixa_id) {
      whereConditions.push('v.caixa_id = ?');
      params.push(caixa_id);
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

    // Filtro por modo offline
    if (offline !== null) {
      whereConditions.push('v.offline = ?');
      params.push(offline === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal
    const query = `
      SELECT 
        v.*,
        c.nome_razao_social as cliente_nome,
        vd.nome as vendedor_nome,
        cx.descricao as caixa_descricao,
        u.nome as usuario_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
      LEFT JOIN caixas cx ON v.caixa_id = cx.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [vendas] = await pool.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
      LEFT JOIN caixas cx ON v.caixa_id = cx.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      vendas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Buscar venda por ID
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar venda
    const [vendas] = await pool.query(`
      SELECT 
        v.*,
        c.nome_razao_social as cliente_nome,
        vd.nome as vendedor_nome,
        cx.descricao as caixa_descricao,
        u.nome as usuario_nome
      FROM vendas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
      LEFT JOIN caixas cx ON v.caixa_id = cx.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `, [id]);

    if (vendas.length === 0) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }

    // Buscar itens da venda
    const [itens] = await pool.query(`
      SELECT 
        vi.*,
        p.codigo as produto_codigo,
        p.descricao as produto_descricao,
        p.unidade
      FROM venda_itens vi
      LEFT JOIN produtos p ON vi.produto_id = p.id
      WHERE vi.venda_id = ?
      ORDER BY p.descricao
    `, [id]);

    res.json({
      ...vendas[0],
      itens
    });

  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Criar nova venda
async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0]?.total > 0;
}

async function findFormaPagamentoId(descricao) {
  if (!descricao) return null;
  const descUpper = descricao.toString().trim().toUpperCase();
  const possuiColunaTipo = await columnExists('formas_pagamento', 'tipo').catch(() => false);
  const consulta = possuiColunaTipo
    ? 'SELECT id FROM formas_pagamento WHERE UPPER(nome) = ? OR UPPER(tipo) = ? LIMIT 1'
    : 'SELECT id FROM formas_pagamento WHERE UPPER(nome) = ? LIMIT 1';
  const params = possuiColunaTipo ? [descUpper, descUpper] : [descUpper];
  const [rows] = await pool.query(consulta, params);
  return rows.length > 0 ? rows[0].id : null;
}

async function tableExists(table) {
  const [rows] = await pool.query('SHOW TABLES LIKE ?', [table]);
  return rows.length > 0;
}

function registroEstaAtivo(valor) {
  if (valor === null || valor === undefined) {
    return true;
  }

  if (typeof valor === 'number') {
    return valor !== 0;
  }

  const texto = String(valor).trim();
  if (texto === '') {
    return true;
  }

  const normalizado = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  return !['0', 'N', 'NAO', 'FALSE', 'INATIVO', 'DESATIVADO', 'F'].includes(normalizado);
}

async function obterProdutoAtivo(produtoId) {
  const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ?', [produtoId]);

  if (rows.length === 0) {
    throw new Error(`Produto ID ${produtoId} não encontrado.`);
  }

  const produto = rows[0];

  if (!registroEstaAtivo(produto.ativo)) {
    const descricao = produto.descricao || produto.nome || `ID ${produtoId}`;
    throw new Error(`Produto ${descricao} está inativo.`);
  }

  return produto;
}

function construirIdentificadorSequencial(ultimoNumero, prefixoPadrao) {
  if (!ultimoNumero) {
    return `${prefixoPadrao}000001`;
  }

  const valor = ultimoNumero.toString().trim();
  const prefixoExtraido = valor.replace(/[0-9]+$/, '');
  const prefixo = prefixoExtraido || prefixoPadrao;
  const blocoNumerico = valor.match(/(\d+)(?!.*\d)/);
  const numeroAtual = blocoNumerico ? parseInt(blocoNumerico[0], 10) : 0;
  const proximo = String((isNaN(numeroAtual) ? 0 : numeroAtual) + 1).padStart(6, '0');
  return `${prefixo}${proximo}`;
}

async function obterIdentificadorVenda() {
  const possuiColunaNumero = await columnExists('vendas', 'numero').catch(() => false);

  if (possuiColunaNumero) {
    try {
      const [ultimaVenda] = await pool.query('SELECT numero FROM vendas ORDER BY id DESC LIMIT 1');
      const ultimoNumero = ultimaVenda.length > 0 ? ultimaVenda[0].numero : null;
      return {
        tipo: 'novo',
        proximoNumero: construirIdentificadorSequencial(ultimoNumero, 'VEN')
      };
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }
  }

  const possuiColunaNumeroPedido = await columnExists('vendas', 'numero_pedido').catch(() => false);

  if (possuiColunaNumeroPedido) {
    try {
      const [ultimaVenda] = await pool.query('SELECT numero_pedido FROM vendas ORDER BY id DESC LIMIT 1');
      const ultimoNumero = ultimaVenda.length > 0 ? ultimaVenda[0].numero_pedido : null;
      return {
        tipo: 'legado',
        proximoNumero: construirIdentificadorSequencial(ultimoNumero, 'PED')
      };
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }
  }

  throw new Error('Estrutura da tabela vendas não possui as colunas numero ou numero_pedido.');
}

exports.criar = async (req, res) => {
  try {
    console.log('🧾 [VENDAS] Iniciando criação de venda...');
    console.log('🧾 [VENDAS] Payload recebido:', JSON.stringify(req.body));
    console.log('🧾 [VENDAS] Usuario no req:', req.user ? { id: req.user.id, login: req.user.login, nome: req.user.nome } : null);
    const {
      cliente_id,
      vendedor_id,
      caixa_id,
      data_venda,
      observacoes,
      itens,
      forma_pagamento,
      offline = false
    } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ message: 'Nenhum item informado para a venda.' });
    }

    // Verificar se vendedor existe (obrigatório)
    const [vendedores] = await pool.query('SELECT id FROM vendedores WHERE id = ? AND ativo = 1', [vendedor_id]);
    if (vendedores.length === 0) {
      return res.status(404).json({ message: 'Vendedor não encontrado.' });
    }

    // Verificar se caixa existe e está aberto
    if (caixa_id) {
      const [caixas] = await pool.query('SELECT * FROM caixas WHERE id = ? AND status = "ABERTO"', [caixa_id]);
      if (caixas.length === 0) {
        return res.status(400).json({ message: 'Caixa não encontrado ou fechado.' });
      }
    }

    // Verificar se cliente existe (se fornecido)
    if (cliente_id) {
      const [clientes] = await pool.query('SELECT id FROM clientes WHERE id = ? AND ativo = 1', [cliente_id]);
      if (clientes.length === 0) {
        return res.status(404).json({ message: 'Cliente não encontrado.' });
      }
    }

  const { tipo, proximoNumero } = await obterIdentificadorVenda();
  console.log('🧾 [VENDAS] Identificador:', { tipo, proximoNumero });

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

    // Verificar qual estrutura usar
    if (tipo === 'novo') {
      await pool.query('START TRANSACTION');
      try {
        console.log('🧾 [VENDAS] Usando estrutura NOVA (coluna numero)');
        const [result] = await pool.query(`
          INSERT INTO vendas (
            numero, cliente_id, vendedor_id, caixa_id, data_venda,
            valor_total, desconto, valor_final, forma_pagamento, observacoes, 
            usuario_id, offline, sincronizado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          proximoNumero, cliente_id, vendedor_id, caixa_id, data_venda,
          valorTotal, desconto, valorFinal, forma_pagamento, observacoes,
          req.user.id, offline ? 1 : 0, offline ? 0 : 1
        ]);

        const vendaId = result.insertId;

        for (const item of itens) {
          const produto = await obterProdutoAtivo(item.produto_id);
          const quantidade = parseFloat(item.quantidade);
          const precoUnitario = parseFloat(item.preco_unitario);
          const itemDesconto = parseFloat(item.desconto) || 0;
          const valorTotalItem = (quantidade * precoUnitario) - itemDesconto;
          console.log('🧾 [VENDAS] Item (novo):', { produto_id: item.produto_id, quantidade, precoUnitario, itemDesconto, valorTotalItem, estoque_atual: produto.estoque_atual });

          if (!offline && produto.estoque_atual < quantidade) {
            throw new Error(`Estoque insuficiente para o produto ${produto.descricao}. Disponível: ${produto.estoque_atual}`);
          }

          await pool.query(`
            INSERT INTO venda_itens (
              venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [vendaId, item.produto_id, quantidade, precoUnitario, itemDesconto, valorTotalItem]);

          if (!offline) {
            const novoEstoque = produto.estoque_atual - quantidade;
            await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);

            await pool.query(`
              INSERT INTO movimentacoes_estoque (
                produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
                documento, observacoes, usuario_id
              ) VALUES (?, 'SAIDA', ?, ?, ?, ?, ?, ?)
            `, [
              item.produto_id, quantidade, produto.estoque_atual, novoEstoque,
              proximoNumero, `Venda - ${proximoNumero}`, req.user.id
            ]);
          }
        }

        if (caixa_id) {
          await pool.query('UPDATE caixas SET valor_atual = valor_atual + ? WHERE id = ?', [valorFinal, caixa_id]);

          await pool.query(`
            INSERT INTO movimentacoes_caixa (
              caixa_id, tipo, valor, descricao, referencia_id, usuario_id
            ) VALUES (?, 'ENTRADA', ?, ?, ?, ?)
          `, [caixa_id, valorFinal, `Venda ${proximoNumero}`, vendaId, req.user.id]);
        }

        await pool.query('COMMIT');

        return res.status(201).json({
          message: 'Venda criada com sucesso.',
          id: vendaId,
          numero: proximoNumero
        });

      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    // Estrutura legada (sem coluna numero)
    await pool.query('START TRANSACTION');
    try {
      const formaPagamentoId = await findFormaPagamentoId(forma_pagamento);
      const usuarioId = req.user?.id || vendedor_id;
      console.log('🧾 [VENDAS] Usando estrutura LEGADA (numero_pedido).', { forma_pagamento, formaPagamentoId, usuarioId });

      if (!usuarioId) {
        throw new Error('Não foi possível determinar o usuário responsável pela venda.');
      }

    const temTabelaVendasItens = await tableExists('vendas_itens');
    const temTabelaItensVenda = await tableExists('itens_venda');
      console.log('🧾 [VENDAS] Tabelas de itens:', { temTabelaVendasItens, temTabelaItensVenda });

      const [result] = await pool.query(`
        INSERT INTO vendas (
          numero_pedido, cliente_id, usuario_id, forma_pagamento_id,
          condicao_pagamento_id, valor_total, desconto_total, outras_despesas,
          observacao, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        proximoNumero,
        cliente_id || null,
        usuarioId,
        formaPagamentoId,
        null,
        valorFinal,
        desconto,
        0,
        observacoes || null,
        'finalizado'
      ]);

      const vendaId = result.insertId;

      for (const item of itens) {
        const produto = await obterProdutoAtivo(item.produto_id);
        const quantidade = parseFloat(item.quantidade);
        const precoUnitario = parseFloat(item.preco_unitario);
        const itemDesconto = parseFloat(item.desconto) || 0;
        const valorTotalItem = (quantidade * precoUnitario) - itemDesconto;
        console.log('🧾 [VENDAS] Item (legado):', { produto_id: item.produto_id, quantidade, precoUnitario, itemDesconto, valorTotalItem, estoque_atual: produto.estoque_atual });

        if (!offline && produto.estoque_atual < quantidade) {
          throw new Error(`Estoque insuficiente para o produto ${produto.descricao}. Disponível: ${produto.estoque_atual}`);
        }

        if (temTabelaVendasItens) {
          await pool.query(`
            INSERT INTO vendas_itens (
              venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [vendaId, item.produto_id, quantidade, precoUnitario, itemDesconto, valorTotalItem]);
        } else if (temTabelaItensVenda) {
          await pool.query(`
            INSERT INTO itens_venda (
              venda_id, produto_id, quantidade, valor_unitario, valor_total
            ) VALUES (?, ?, ?, ?, ?)
          `, [vendaId, item.produto_id, quantidade, precoUnitario, valorTotalItem]);
        } else {
          throw new Error('Tabela de itens de venda não encontrada (esperado vendas_itens ou itens_venda).');
        }

        if (!offline) {
          const novoEstoque = produto.estoque_atual - quantidade;
          await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);
        }
      }

      await pool.query('COMMIT');

      return res.status(201).json({
        message: 'Venda criada com sucesso.',
        id: vendaId,
        numero: proximoNumero
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ [VENDAS] Erro ao criar venda:', error);
    if (error && error.sql) {
      console.error('❌ [VENDAS] SQL:', error.sql);
    }
    console.error('❌ [VENDAS] Stack:', error.stack);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Cancelar venda
exports.cancelar = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar se venda existe e não está cancelada
    const [vendas] = await pool.query('SELECT * FROM vendas WHERE id = ?', [id]);
    if (vendas.length === 0) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }

    const venda = vendas[0];
    if (venda.status === 'CANCELADA') {
      return res.status(400).json({ message: 'Venda já está cancelada.' });
    }

    // Iniciar transação
    await pool.query('START TRANSACTION');

    try {
      // Buscar itens da venda
      const [itens] = await pool.query('SELECT * FROM venda_itens WHERE venda_id = ?', [id]);

      // Reverter estoque de cada item (apenas se não for offline)
      if (!venda.offline) {
        for (const item of itens) {
          const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [item.produto_id]);
          if (produtos.length > 0) {
            const produto = produtos[0];
            const novoEstoque = produto.estoque_atual + parseFloat(item.quantidade);

            await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);

            // Registrar movimentação de reversão
            await pool.query(`
              INSERT INTO movimentacoes_estoque (
                produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
                documento, observacoes, usuario_id
              ) VALUES (?, 'ENTRADA', ?, ?, ?, ?, ?, ?)
            `, [
              item.produto_id, item.quantidade, produto.estoque_atual, novoEstoque,
              venda.numero, `Cancelamento de venda - ${venda.numero}`, req.user.id
            ]);
          }
        }
      }

      // Reverter movimentação de caixa (se houver)
      if (venda.caixa_id) {
        await pool.query('UPDATE caixas SET valor_atual = valor_atual - ? WHERE id = ?', [venda.valor_final, venda.caixa_id]);

        // Registrar movimentação de reversão
        await pool.query(`
          INSERT INTO movimentacoes_caixa (
            caixa_id, tipo, valor, descricao, referencia_id, usuario_id
          ) VALUES (?, 'SAIDA', ?, ?, ?, ?)
        `, [venda.caixa_id, venda.valor_final, `Cancelamento venda ${venda.numero}`, id, req.user.id]);
      }

      // Atualizar status da venda
      await pool.query('UPDATE vendas SET status = "CANCELADA", observacoes = CONCAT(IFNULL(observacoes, ""), "\nCancelada: ", ?) WHERE id = ?', [motivo || 'Sem motivo informado', id]);

      await pool.query('COMMIT');

      res.json({ message: 'Venda cancelada com sucesso.' });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Sincronizar vendas offline
exports.sincronizar = async (req, res) => {
  try {
    const { vendas } = req.body;

    if (!Array.isArray(vendas)) {
      return res.status(400).json({ message: 'Lista de vendas inválida.' });
    }

    const resultados = [];

    for (const vendaData of vendas) {
      try {
        // Verificar se venda já existe
        const [existing] = await pool.query('SELECT id FROM vendas WHERE numero = ?', [vendaData.numero]);
        
        if (existing.length > 0) {
          resultados.push({
            numero: vendaData.numero,
            status: 'já_existe',
            message: 'Venda já sincronizada'
          });
          continue;
        }

        // Processar venda offline
        const resultado = await processarVendaOffline(vendaData, req.user.id);
        resultados.push(resultado);

      } catch (error) {
        resultados.push({
          numero: vendaData.numero,
          status: 'erro',
          message: error.message
        });
      }
    }

    res.json({
      message: 'Sincronização concluída.',
      resultados
    });

  } catch (error) {
    console.error('Erro ao sincronizar vendas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Função auxiliar para processar venda offline
async function processarVendaOffline(vendaData, usuarioId) {
  await pool.query('START TRANSACTION');

  try {
    // Criar venda
    const [result] = await pool.query(`
      INSERT INTO vendas (
        numero, cliente_id, vendedor_id, caixa_id, data_venda,
        valor_total, desconto, valor_final, forma_pagamento, observacoes, 
        usuario_id, offline, sincronizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vendaData.numero, vendaData.cliente_id, vendaData.vendedor_id, vendaData.caixa_id, vendaData.data_venda,
      vendaData.valor_total, vendaData.desconto, vendaData.valor_final, vendaData.forma_pagamento, vendaData.observacoes,
      usuarioId, 0, 1
    ]);

    const vendaId = result.insertId;

    // Processar itens e baixar estoque
    for (const item of vendaData.itens) {
      await pool.query(`
        INSERT INTO venda_itens (
          venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.desconto, item.valor_total]);

      // Baixar estoque
      const [produtos] = await pool.query('SELECT * FROM produtos WHERE id = ?', [item.produto_id]);
      if (produtos.length > 0) {
        const produto = produtos[0];
        const novoEstoque = produto.estoque_atual - parseFloat(item.quantidade);
        
        if (novoEstoque < 0) {
          throw new Error(`Estoque insuficiente para o produto ${produto.descricao}`);
        }

        await pool.query('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [novoEstoque, item.produto_id]);

        // Registrar movimentação
        await pool.query(`
          INSERT INTO movimentacoes_estoque (
            produto_id, tipo, quantidade, saldo_anterior, saldo_atual, 
            documento, observacoes, usuario_id
          ) VALUES (?, 'SAIDA', ?, ?, ?, ?, ?, ?)
        `, [
          item.produto_id, item.quantidade, produto.estoque_atual, novoEstoque,
          vendaData.numero, `Sincronização venda offline - ${vendaData.numero}`, usuarioId
        ]);
      }
    }

    await pool.query('COMMIT');

    return {
      numero: vendaData.numero,
      status: 'sucesso',
      message: 'Venda sincronizada com sucesso',
      id: vendaId
    };

  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

