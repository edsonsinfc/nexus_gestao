const pool = require('../src/config/db');

// =====================================================
// DASHBOARD E RELATÓRIOS
// =====================================================

// Dashboard principal do estoque
exports.dashboard = async (req, res) => {
  try {
    const [resumo] = await pool.query(`
      SELECT 
        COUNT(*) as total_produtos,
        SUM(estoque_atual) as total_unidades,
        SUM(estoque_atual * preco_custo) as valor_total_estoque,
        SUM(CASE WHEN estoque_atual <= estoque_minimo AND estoque_minimo > 0 THEN 1 ELSE 0 END) as produtos_estoque_baixo,
        SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as produtos_sem_estoque,
        SUM(CASE WHEN estoque_atual >= estoque_maximo AND estoque_maximo > 0 THEN 1 ELSE 0 END) as produtos_estoque_alto
      FROM produtos
      WHERE ativo = 1
    `);

    const [alertasAtivos] = await pool.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN nivel_alerta = 'CRITICO' THEN 1 ELSE 0 END) as criticos,
             SUM(CASE WHEN nivel_alerta = 'ALTO' THEN 1 ELSE 0 END) as altos,
             SUM(CASE WHEN nivel_alerta = 'MEDIO' THEN 1 ELSE 0 END) as medios
      FROM alertas_estoque
      WHERE status = 'ATIVO'
    `);

    const [movimentacoesHoje] = await pool.query(`
      SELECT 
        tipo,
        COUNT(*) as quantidade,
        SUM(quantidade) as total_unidades
      FROM movimentacoes_estoque
      WHERE DATE(data_movimentacao) = CURDATE()
      GROUP BY tipo
    `);

    const [topProdutosBaixos] = await pool.query(`
      SELECT 
        p.id,
        p.codigo_principal,
        p.descricao,
        p.estoque_atual,
        p.estoque_minimo,
        s.nome as categoria
      FROM produtos p
      LEFT JOIN secoes s ON p.categoria_id = s.id
      WHERE p.ativo = 1 
        AND p.estoque_atual <= p.estoque_minimo 
        AND p.estoque_minimo > 0
      ORDER BY (p.estoque_minimo - p.estoque_atual) DESC
      LIMIT 10
    `);

    res.json({
      resumo: resumo[0],
      alertas: alertasAtivos[0],
      movimentacoes_hoje: movimentacoesHoje,
      produtos_atencao: topProdutosBaixos
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ message: 'Erro ao carregar dashboard de estoque.' });
  }
};

// Relatório de estoque consolidado
exports.relatorioEstoque = async (req, res) => {
  try {
    const { categoria_id, situacao, busca } = req.query;
    
    let whereClause = 'WHERE p.ativo = 1';
    const params = [];
    
    if (categoria_id) {
      whereClause += ' AND p.categoria_id = ?';
      params.push(categoria_id);
    }
    
    if (busca) {
      whereClause += ' AND (p.codigo_principal LIKE ? OR p.descricao LIKE ? OR p.gtin LIKE ?)';
      const searchTerm = `%${busca}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    const query = `
      SELECT * FROM vw_estoque_consolidado
      ${whereClause.replace('p.ativo', 'ativo').replace('p.categoria_id', 'categoria_id').replace('p.codigo_principal', 'codigo_principal').replace('p.descricao', 'descricao').replace('p.gtin', 'gtin')}
      ${situacao ? `AND situacao_estoque = '${situacao}'` : ''}
      ORDER BY descricao
    `;
    
    const [produtos] = await pool.query(query, params);
    
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de estoque.' });
  }
};

// Relatório de movimentações
exports.relatorioMovimentacoes = async (req, res) => {
  try {
    const { produto_id, tipo, data_inicio, data_fim } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (produto_id) {
      whereClause += ' AND produto_id = ?';
      params.push(produto_id);
    }
    
    if (tipo) {
      whereClause += ' AND tipo = ?';
      params.push(tipo);
    }
    
    if (data_inicio) {
      whereClause += ' AND DATE(data_movimentacao) >= ?';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      whereClause += ' AND DATE(data_movimentacao) <= ?';
      params.push(data_fim);
    }
    
    const [movimentacoes] = await pool.query(`
      SELECT * FROM vw_movimentacoes_detalhadas
      ${whereClause}
      ORDER BY data_movimentacao DESC
      LIMIT 1000
    `, params);
    
    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de movimentações.' });
  }
};

// =====================================================
// MOVIMENTAÇÕES DE ESTOQUE
// =====================================================

// Listar movimentações de estoque
exports.listarMovimentacoes = async (req, res) => {
  try {
    const { produto_id, tipo, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (produto_id) {
      whereClause += ' AND m.produto_id = ?';
      params.push(produto_id);
    }
    
    if (tipo) {
      whereClause += ' AND m.tipo = ?';
      params.push(tipo);
    }
    
    if (data_inicio) {
      whereClause += ' AND DATE(m.data_movimentacao) >= ?';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      whereClause += ' AND DATE(m.data_movimentacao) <= ?';
      params.push(data_fim);
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const query = `
      SELECT 
        m.*,
        p.codigo_principal,
        p.descricao as produto_descricao,
        u.nome as usuario_nome
      FROM movimentacoes_estoque m
      LEFT JOIN produtos p ON m.produto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ${whereClause}
      ORDER BY m.data_movimentacao DESC, m.id DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    const [movimentacoes] = await pool.query(query, params);
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM movimentacoes_estoque m ${whereClause}`,
      params.slice(0, -2)
    );
    
    res.json({
      movimentacoes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ message: 'Erro ao listar movimentações de estoque.' });
  }
};

// Registrar movimentação de estoque
exports.registrarMovimentacao = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      produto_id,
      tipo, // ENTRADA, SAIDA, AJUSTE_ENTRADA, AJUSTE_SAIDA, DEVOLUCAO, PERDA, TRANSFERENCIA
      quantidade,
      motivo,
      observacao,
      documento_referencia
    } = req.body;
    
    if (!produto_id || !tipo || !quantidade) {
      return res.status(400).json({ message: 'Produto, tipo e quantidade são obrigatórios.' });
    }
    
    if (quantidade <= 0) {
      return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
    }
    
    // Buscar produto atual
    const [produtos] = await connection.query(
      'SELECT estoque_atual, descricao FROM produtos WHERE id = ?',
      [produto_id]
    );
    
    if (produtos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    const estoqueAtual = parseFloat(produtos[0].estoque_atual) || 0;
    let novoEstoque = estoqueAtual;
    
    // Calcular novo estoque baseado no tipo de movimentação
    if (['ENTRADA', 'AJUSTE_ENTRADA', 'DEVOLUCAO'].includes(tipo)) {
      novoEstoque = estoqueAtual + parseFloat(quantidade);
    } else if (['SAIDA', 'AJUSTE_SAIDA', 'PERDA', 'TRANSFERENCIA'].includes(tipo)) {
      novoEstoque = estoqueAtual - parseFloat(quantidade);
      
      if (novoEstoque < 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Estoque insuficiente. Estoque atual: ' + estoqueAtual 
        });
      }
    }
    
    // Registrar movimentação
    const [result] = await connection.query(
      `INSERT INTO movimentacoes_estoque 
       (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, observacao, documento_referencia, usuario_id, data_movimentacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [produto_id, tipo, quantidade, estoqueAtual, novoEstoque, motivo, observacao, documento_referencia, req.user.id]
    );
    
    // Atualizar estoque do produto
    await connection.query(
      'UPDATE produtos SET estoque_atual = ? WHERE id = ?',
      [novoEstoque, produto_id]
    );
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Movimentação registrada com sucesso!',
      movimentacao_id: result.insertId,
      produto: produtos[0].descricao,
      estoque_anterior: estoqueAtual,
      estoque_novo: novoEstoque
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ message: 'Erro ao registrar movimentação de estoque.' });
  } finally {
    connection.release();
  }
};

// Listar produtos com estoque
exports.listarProdutosEstoque = async (req, res) => {
  try {
    const { busca, estoque_baixo } = req.query;
    
    let whereClause = 'WHERE p.ativo = 1';
    const params = [];
    
    if (busca) {
      whereClause += ' AND (p.codigo_principal LIKE ? OR p.descricao LIKE ? OR p.gtin LIKE ?)';
      const searchTerm = `%${busca}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (estoque_baixo === 'true') {
      whereClause += ' AND p.estoque_atual <= p.estoque_minimo AND p.estoque_minimo > 0';
    }
    
    const [produtos] = await pool.query(
      `SELECT 
        p.id,
        p.codigo_principal,
        p.descricao,
        p.unidade,
        p.estoque_atual,
        p.estoque_minimo,
        p.estoque_maximo,
        p.preco_custo,
        p.preco_venda,
        s.nome as categoria_nome,
        p.localizacao
      FROM produtos p
      LEFT JOIN secoes s ON p.categoria_id = s.id
      ${whereClause}
      ORDER BY p.descricao`,
      params
    );
    
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ message: 'Erro ao listar produtos.' });
  }
};

// Relatório de estoque
exports.relatorioEstoque = async (req, res) => {
  try {
    const [relatorio] = await pool.query(`
      SELECT 
        COUNT(*) as total_produtos,
        SUM(CASE WHEN estoque_atual <= estoque_minimo AND estoque_minimo > 0 THEN 1 ELSE 0 END) as produtos_estoque_baixo,
        SUM(CASE WHEN estoque_atual = 0 THEN 1 ELSE 0 END) as produtos_sem_estoque,
        SUM(estoque_atual * preco_custo) as valor_total_estoque
      FROM produtos
      WHERE ativo = 1
    `);
    
    res.json(relatorio[0]);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório de estoque.' });
  }
};

// =====================================================
// AJUSTES E INVENTÁRIO
// =====================================================

// Criar inventário
exports.criarInventario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { descricao, tipo, produtos_selecionados } = req.body;
    
    if (!descricao || !tipo) {
      return res.status(400).json({ message: 'Descrição e tipo são obrigatórios.' });
    }
    
    // Gerar número do inventário
    const numero = `INV-${Date.now()}`;
    
    // Criar inventário
    const [result] = await connection.query(
      `INSERT INTO inventario_estoque 
       (numero_inventario, descricao, data_inicio, tipo, status, usuario_criacao_id)
       VALUES (?, ?, NOW(), ?, 'ABERTO', ?)`,
      [numero, descricao, tipo, req.user.id]
    );
    
    const inventarioId = result.insertId;
    
    // Adicionar produtos ao inventário
    let query;
    if (tipo === 'TOTAL') {
      // Inventário total - todos os produtos ativos
      query = `
        INSERT INTO inventario_itens (inventario_id, produto_id, estoque_sistema, custo_unitario, status)
        SELECT ?, id, estoque_atual, preco_custo, 'PENDENTE'
        FROM produtos
        WHERE ativo = 1
      `;
      await connection.query(query, [inventarioId]);
    } else if (tipo === 'PARCIAL' && produtos_selecionados && produtos_selecionados.length > 0) {
      // Inventário parcial - produtos selecionados
      const values = produtos_selecionados.map(produtoId => [
        inventarioId, produtoId
      ]);
      
      query = `
        INSERT INTO inventario_itens (inventario_id, produto_id, estoque_sistema, custo_unitario, status)
        SELECT ?, id, estoque_atual, preco_custo, 'PENDENTE'
        FROM produtos
        WHERE id IN (?)
      `;
      await connection.query(query, [inventarioId, produtos_selecionados]);
    }
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Inventário criado com sucesso!',
      inventario_id: inventarioId,
      numero: numero
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar inventário:', error);
    res.status(500).json({ message: 'Erro ao criar inventário.' });
  } finally {
    connection.release();
  }
};

// Listar inventários
exports.listarInventarios = async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }
    
    const [inventarios] = await pool.query(`
      SELECT 
        i.*,
        u1.nome as criado_por,
        u2.nome as concluido_por,
        (SELECT COUNT(*) FROM inventario_itens WHERE inventario_id = i.id) as total_itens,
        (SELECT COUNT(*) FROM inventario_itens WHERE inventario_id = i.id AND status = 'CONTADO') as itens_contados
      FROM inventario_estoque i
      LEFT JOIN usuarios u1 ON i.usuario_criacao_id = u1.id
      LEFT JOIN usuarios u2 ON i.usuario_conclusao_id = u2.id
      ${whereClause}
      ORDER BY i.data_inicio DESC
    `, params);
    
    res.json(inventarios);
  } catch (error) {
    console.error('Erro ao listar inventários:', error);
    res.status(500).json({ message: 'Erro ao listar inventários.' });
  }
};

// Obter detalhes do inventário
exports.obterInventario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [inventario] = await pool.query(`
      SELECT 
        i.*,
        u1.nome as criado_por,
        u2.nome as concluido_por
      FROM inventario_estoque i
      LEFT JOIN usuarios u1 ON i.usuario_criacao_id = u1.id
      LEFT JOIN usuarios u2 ON i.usuario_conclusao_id = u2.id
      WHERE i.id = ?
    `, [id]);
    
    if (inventario.length === 0) {
      return res.status(404).json({ message: 'Inventário não encontrado.' });
    }
    
    const [itens] = await pool.query(`
      SELECT 
        ii.*,
        p.codigo_principal,
        p.descricao as produto_descricao,
        p.unidade,
        s.nome as categoria,
        u1.nome as contado_por,
        u2.nome as ajustado_por
      FROM inventario_itens ii
      INNER JOIN produtos p ON ii.produto_id = p.id
      LEFT JOIN secoes s ON p.categoria_id = s.id
      LEFT JOIN usuarios u1 ON ii.usuario_contagem_id = u1.id
      LEFT JOIN usuarios u2 ON ii.usuario_ajuste_id = u2.id
      WHERE ii.inventario_id = ?
      ORDER BY p.descricao
    `, [id]);
    
    res.json({
      inventario: inventario[0],
      itens: itens
    });
  } catch (error) {
    console.error('Erro ao obter inventário:', error);
    res.status(500).json({ message: 'Erro ao obter inventário.' });
  }
};

// Registrar contagem de item do inventário
exports.registrarContagem = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { item_id, estoque_contado, observacoes } = req.body;
    
    if (estoque_contado === undefined || estoque_contado === null) {
      return res.status(400).json({ message: 'Estoque contado é obrigatório.' });
    }
    
    // Buscar item do inventário
    const [itens] = await connection.query(
      'SELECT * FROM inventario_itens WHERE id = ? AND inventario_id = ?',
      [item_id, id]
    );
    
    if (itens.length === 0) {
      return res.status(404).json({ message: 'Item do inventário não encontrado.' });
    }
    
    const item = itens[0];
    const divergencia = parseFloat(estoque_contado) - parseFloat(item.estoque_sistema);
    const valorDivergencia = divergencia * parseFloat(item.custo_unitario);
    
    // Atualizar item
    await connection.query(
      `UPDATE inventario_itens 
       SET estoque_contado = ?, 
           divergencia = ?,
           valor_divergencia = ?,
           status = 'CONTADO',
           observacoes = ?,
           usuario_contagem_id = ?,
           data_contagem = NOW()
       WHERE id = ?`,
      [estoque_contado, divergencia, valorDivergencia, observacoes, req.user.id, item_id]
    );
    
    // Atualizar totalizadores do inventário
    await connection.query(
      `UPDATE inventario_estoque 
       SET total_itens_contados = (SELECT COUNT(*) FROM inventario_itens WHERE inventario_id = ? AND status = 'CONTADO'),
           total_divergencias = (SELECT COUNT(*) FROM inventario_itens WHERE inventario_id = ? AND divergencia != 0),
           valor_divergencia = (SELECT COALESCE(SUM(valor_divergencia), 0) FROM inventario_itens WHERE inventario_id = ?)
       WHERE id = ?`,
      [id, id, id, id]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Contagem registrada com sucesso!',
      divergencia: divergencia,
      valor_divergencia: valorDivergencia
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao registrar contagem:', error);
    res.status(500).json({ message: 'Erro ao registrar contagem.' });
  } finally {
    connection.release();
  }
};

// Concluir inventário e ajustar estoques
exports.concluirInventario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Verificar se inventário existe e está em aberto
    const [inventarios] = await connection.query(
      'SELECT * FROM inventario_estoque WHERE id = ? AND status IN ("ABERTO", "EM_CONTAGEM")',
      [id]
    );
    
    if (inventarios.length === 0) {
      return res.status(404).json({ message: 'Inventário não encontrado ou já concluído.' });
    }
    
    // Buscar itens com divergência
    const [itens] = await connection.query(
      `SELECT * FROM inventario_itens 
       WHERE inventario_id = ? 
         AND status = 'CONTADO' 
         AND divergencia != 0`,
      [id]
    );
    
    // Ajustar estoque de cada item com divergência
    for (const item of itens) {
      const tipo = item.divergencia > 0 ? 'AJUSTE_ENTRADA' : 'AJUSTE_SAIDA';
      const quantidadeAjuste = Math.abs(item.divergencia);
      
      // Buscar produto atual
      const [produtos] = await connection.query(
        'SELECT estoque_atual FROM produtos WHERE id = ?',
        [item.produto_id]
      );
      
      const estoqueAnterior = parseFloat(produtos[0].estoque_atual);
      const estoqueNovo = parseFloat(item.estoque_contado);
      
      // Registrar movimentação
      await connection.query(
        `INSERT INTO movimentacoes_estoque 
         (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, observacao, 
          documento_referencia, referencia_tipo, referencia_id, usuario_id, data_movimentacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          item.produto_id, 
          tipo, 
          quantidadeAjuste, 
          estoqueAnterior, 
          estoqueNovo,
          'Ajuste por inventário',
          item.observacoes,
          inventarios[0].numero_inventario,
          'INVENTARIO',
          id,
          req.user.id
        ]
      );
      
      // Atualizar estoque do produto
      await connection.query(
        'UPDATE produtos SET estoque_atual = ? WHERE id = ?',
        [estoqueNovo, item.produto_id]
      );
      
      // Marcar item como ajustado
      await connection.query(
        `UPDATE inventario_itens 
         SET status = 'AJUSTADO', usuario_ajuste_id = ?, data_ajuste = NOW()
         WHERE id = ?`,
        [req.user.id, item.id]
      );
    }
    
    // Concluir inventário
    await connection.query(
      `UPDATE inventario_estoque 
       SET status = 'CONCLUIDO', 
           data_conclusao = NOW(),
           usuario_conclusao_id = ?
       WHERE id = ?`,
      [req.user.id, id]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Inventário concluído com sucesso!',
      itens_ajustados: itens.length
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao concluir inventário:', error);
    res.status(500).json({ message: 'Erro ao concluir inventário.' });
  } finally {
    connection.release();
  }
};

// Ajuste manual de estoque
exports.ajusteManual = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      produto_id,
      quantidade_ajuste,
      tipo_ajuste, // 'ENTRADA' ou 'SAIDA'
      motivo,
      observacao
    } = req.body;
    
    if (!produto_id || !quantidade_ajuste || !tipo_ajuste) {
      return res.status(400).json({ message: 'Produto, quantidade e tipo de ajuste são obrigatórios.' });
    }
    
    if (quantidade_ajuste <= 0) {
      return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
    }
    
    // Buscar produto atual
    const [produtos] = await connection.query(
      'SELECT estoque_atual, descricao FROM produtos WHERE id = ?',
      [produto_id]
    );
    
    if (produtos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    const estoqueAtual = parseFloat(produtos[0].estoque_atual) || 0;
    let novoEstoque;
    let tipoMovimentacao;
    
    if (tipo_ajuste === 'ENTRADA') {
      novoEstoque = estoqueAtual + parseFloat(quantidade_ajuste);
      tipoMovimentacao = 'AJUSTE_ENTRADA';
    } else {
      novoEstoque = estoqueAtual - parseFloat(quantidade_ajuste);
      tipoMovimentacao = 'AJUSTE_SAIDA';
      
      if (novoEstoque < 0) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Estoque insuficiente. Estoque atual: ' + estoqueAtual 
        });
      }
    }
    
    // Registrar movimentação
    const [result] = await connection.query(
      `INSERT INTO movimentacoes_estoque 
       (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, observacao, 
        referencia_tipo, usuario_id, data_movimentacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'AJUSTE_MANUAL', ?, NOW())`,
      [produto_id, tipoMovimentacao, quantidade_ajuste, estoqueAtual, novoEstoque, motivo, observacao, req.user.id]
    );
    
    // Atualizar estoque do produto
    await connection.query(
      'UPDATE produtos SET estoque_atual = ? WHERE id = ?',
      [novoEstoque, produto_id]
    );
    
    await connection.commit();
    
    res.json({
      message: 'Ajuste realizado com sucesso!',
      produto: produtos[0].descricao,
      estoque_anterior: estoqueAtual,
      estoque_novo: novoEstoque
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao realizar ajuste:', error);
    res.status(500).json({ message: 'Erro ao realizar ajuste de estoque.' });
  } finally {
    connection.release();
  }
};

// =====================================================
// ALERTAS
// =====================================================

// Listar alertas ativos
exports.listarAlertas = async (req, res) => {
  try {
    const { nivel_alerta, tipo_alerta } = req.query;
    
    let whereClause = 'WHERE status = "ATIVO"';
    const params = [];
    
    if (nivel_alerta) {
      whereClause += ' AND nivel_alerta = ?';
      params.push(nivel_alerta);
    }
    
    if (tipo_alerta) {
      whereClause += ' AND tipo_alerta = ?';
      params.push(tipo_alerta);
    }
    
    const [alertas] = await pool.query(`
      SELECT * FROM vw_alertas_ativos
      ${whereClause}
    `, params);
    
    res.json(alertas);
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ message: 'Erro ao listar alertas.' });
  }
};

// Resolver alerta
exports.resolverAlerta = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      `UPDATE alertas_estoque 
       SET status = 'RESOLVIDO', 
           data_resolucao = NOW(),
           usuario_resolucao_id = ?
       WHERE id = ?`,
      [req.user.id, id]
    );
    
    res.json({ message: 'Alerta resolvido com sucesso!' });
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({ message: 'Erro ao resolver alerta.' });
  }
};

// =====================================================
// LOTES
// =====================================================

// Criar lote
exports.criarLote = async (req, res) => {
  try {
    const {
      produto_id,
      numero_lote,
      quantidade_inicial,
      data_fabricacao,
      data_validade,
      custo_unitario,
      fornecedor_id,
      documento_entrada,
      localizacao,
      observacoes
    } = req.body;
    
    if (!produto_id || !numero_lote || !quantidade_inicial || !custo_unitario) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
    }
    
    const valorTotal = parseFloat(quantidade_inicial) * parseFloat(custo_unitario);
    
    const [result] = await pool.query(
      `INSERT INTO lotes_estoque 
       (produto_id, numero_lote, quantidade_inicial, quantidade_atual, data_fabricacao, 
        data_validade, data_entrada, custo_unitario, valor_total, fornecedor_id, 
        documento_entrada, localizacao, observacoes, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        produto_id, numero_lote, quantidade_inicial, quantidade_inicial, data_fabricacao,
        data_validade, custo_unitario, valorTotal, fornecedor_id, documento_entrada,
        localizacao, observacoes, req.user.id
      ]
    );
    
    res.status(201).json({
      message: 'Lote criado com sucesso!',
      lote_id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao criar lote:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Lote já existe para este produto.' });
    }
    res.status(500).json({ message: 'Erro ao criar lote.' });
  }
};

// Listar lotes de um produto
exports.listarLotes = async (req, res) => {
  try {
    const { produto_id, status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (produto_id) {
      whereClause += ' AND l.produto_id = ?';
      params.push(produto_id);
    }
    
    if (status) {
      whereClause += ' AND l.status = ?';
      params.push(status);
    }
    
    const [lotes] = await pool.query(`
      SELECT 
        l.*,
        p.codigo_principal,
        p.descricao as produto_descricao,
        f.razao_social as fornecedor_nome,
        u.nome as criado_por
      FROM lotes_estoque l
      INNER JOIN produtos p ON l.produto_id = p.id
      LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ${whereClause}
      ORDER BY l.data_validade ASC, l.data_entrada DESC
    `, params);
    
    res.json(lotes);
  } catch (error) {
    console.error('Erro ao listar lotes:', error);
    res.status(500).json({ message: 'Erro ao listar lotes.' });
  }
};
