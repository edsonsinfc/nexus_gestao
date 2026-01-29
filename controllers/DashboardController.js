const pool = require('../src/config/db');

exports.obterEstatisticas = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    // Total de produtos
    const [produtos] = await pool.query('SELECT COUNT(*) as total FROM produtos WHERE ativo = 1');
    
    // Total de clientes
    const [clientes] = await pool.query('SELECT COUNT(*) as total FROM clientes WHERE ativo = 1');
    
    // Vendas hoje
    const [vendasHoje] = await pool.query(
      'SELECT COUNT(*) as total FROM vendas WHERE DATE(data_venda) = ?',
      [hoje]
    );
    
    // Produtos com estoque baixo
    const [estoqueBaixo] = await pool.query(
      'SELECT COUNT(*) as total FROM produtos WHERE ativo = 1 AND estoque_atual <= estoque_minimo AND estoque_minimo > 0'
    );
    
    // Valor total em vendas hoje
    const [valorVendasHoje] = await pool.query(
      'SELECT COALESCE(SUM(valor_total), 0) as total FROM vendas WHERE DATE(data_venda) = ?',
      [hoje]
    );
    
    // Vendas por vendedor (top 5)
    const [vendasPorVendedor] = await pool.query(`
      SELECT 
        v.nome,
        COUNT(ve.id) as total_vendas,
        COALESCE(SUM(ve.valor_total), 0) as valor_total
      FROM vendedores v
      LEFT JOIN vendas ve ON v.id = ve.vendedor_id AND DATE(ve.data_venda) = ?
      WHERE v.ativo = 1
      GROUP BY v.id, v.nome
      ORDER BY valor_total DESC
      LIMIT 5
    `, [hoje]);
    
    // Produtos mais vendidos (últimos 7 dias)
    const [produtosMaisVendidos] = await pool.query(`
      SELECT 
        p.descricao,
        SUM(vi.quantidade) as quantidade_vendida,
        SUM(vi.valor_total) as valor_total
      FROM produtos p
      INNER JOIN vendas_itens vi ON p.id = vi.produto_id
      INNER JOIN vendas v ON vi.venda_id = v.id
      WHERE v.data_venda >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY p.id, p.descricao
      ORDER BY quantidade_vendida DESC
      LIMIT 10
    `);

    // Vendas dos últimos 7 dias
    const [vendasSemana] = await pool.query(`
      SELECT 
        DATE(data_venda) as data,
        COUNT(*) as total_vendas,
        COALESCE(SUM(valor_total), 0) as valor_total
      FROM vendas
      WHERE data_venda >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(data_venda)
      ORDER BY data ASC
    `);

    res.json({
      estatisticas: {
        totalProdutos: produtos[0].total,
        totalClientes: clientes[0].total,
        vendasHoje: vendasHoje[0].total,
        estoqueBaixo: estoqueBaixo[0].total,
        valorVendasHoje: parseFloat(valorVendasHoje[0].total)
      },
      vendasPorVendedor,
      produtosMaisVendidos,
      vendasSemana
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas do dashboard.' });
  }
};
