const db = require('../db');

/**
 * Controller para Demonstração do Resultado do Exercício (DRE)
 * Gera relatórios gerenciais de resultado com receitas, custos e despesas
 */

const DREController = {
  /**
   * Gerar DRE por período
   * @route GET /api/dre
   */
  async gerarDRE(req, res) {
    try {
      const { data_inicio, data_fim } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Período obrigatório (data_inicio e data_fim)' });
      }

      // 1. RECEITA BRUTA (vendas)
      const [receitaBruta] = await db.query(`
        SELECT 
          COALESCE(SUM(valor), 0) as valor
        FROM lancamentos_financeiros
        WHERE tipo = 'RECEITA'
          AND categoria_id IN (
            SELECT id FROM categorias_financeiras 
            WHERE dre_grupo = 'RECEITA_BRUTA'
          )
          AND data_lancamento BETWEEN ? AND ?
          AND status != 'CANCELADO'
      `, [data_inicio, data_fim]);

      // 2. DEDUÇÕES (devoluções, descontos)
      const [deducoes] = await db.query(`
        SELECT 
          COALESCE(SUM(valor), 0) as valor
        FROM lancamentos_financeiros
        WHERE tipo = 'RECEITA'
          AND categoria_id IN (
            SELECT id FROM categorias_financeiras 
            WHERE dre_grupo = 'DEDUCOES'
          )
          AND data_lancamento BETWEEN ? AND ?
          AND status != 'CANCELADO'
      `, [data_inicio, data_fim]);

      // 3. RECEITA LÍQUIDA
      const receitaLiquida = receitaBruta[0].valor - deducoes[0].valor;

      // 4. CMV (Custo de Mercadorias Vendidas)
      const [cmv] = await db.query(`
        SELECT 
          COALESCE(SUM(valor), 0) as valor
        FROM lancamentos_financeiros
        WHERE tipo = 'DESPESA'
          AND categoria_id IN (
            SELECT id FROM categorias_financeiras 
            WHERE dre_grupo = 'CMV'
          )
          AND data_lancamento BETWEEN ? AND ?
          AND status != 'CANCELADO'
      `, [data_inicio, data_fim]);

      // 5. LUCRO BRUTO
      const lucroBruto = receitaLiquida - cmv[0].valor;

      // 6. DESPESAS OPERACIONAIS (detalhadas)
      const [despesasOperacionais] = await db.query(`
        SELECT 
          c.nome as categoria,
          c.codigo,
          COALESCE(SUM(l.valor), 0) as valor
        FROM categorias_financeiras c
        LEFT JOIN lancamentos_financeiros l ON l.categoria_id = c.id
          AND l.data_lancamento BETWEEN ? AND ?
          AND l.status != 'CANCELADO'
        WHERE c.dre_grupo = 'DESPESA_OPERACIONAL'
          AND c.nivel = 1
        GROUP BY c.id, c.nome, c.codigo
        ORDER BY c.codigo
      `, [data_inicio, data_fim]);

      const totalDespesasOperacionais = despesasOperacionais.reduce((sum, d) => sum + parseFloat(d.valor), 0);

      // 7. LUCRO OPERACIONAL
      const lucroOperacional = lucroBruto - totalDespesasOperacionais;

      // 8. RECEITAS FINANCEIRAS
      const [receitasFinanceiras] = await db.query(`
        SELECT 
          COALESCE(SUM(valor), 0) as valor
        FROM lancamentos_financeiros
        WHERE tipo = 'RECEITA'
          AND categoria_id IN (
            SELECT id FROM categorias_financeiras 
            WHERE dre_grupo = 'RECEITA_FINANCEIRA'
          )
          AND data_lancamento BETWEEN ? AND ?
          AND status != 'CANCELADO'
      `, [data_inicio, data_fim]);

      // 9. DESPESAS FINANCEIRAS
      const [despesasFinanceiras] = await db.query(`
        SELECT 
          COALESCE(SUM(valor), 0) as valor
        FROM lancamentos_financeiros
        WHERE tipo = 'DESPESA'
          AND categoria_id IN (
            SELECT id FROM categorias_financeiras 
            WHERE dre_grupo = 'DESPESA_FINANCEIRA'
          )
          AND data_lancamento BETWEEN ? AND ?
          AND status != 'CANCELADO'
      `, [data_inicio, data_fim]);

      // 10. RESULTADO FINANCEIRO
      const resultadoFinanceiro = receitasFinanceiras[0].valor - despesasFinanceiras[0].valor;

      // 11. OUTRAS RECEITAS/DESPESAS
      const [outrasReceitas] = await db.query(`
        SELECT 
          COALESCE(SUM(valor), 0) as valor
        FROM lancamentos_financeiros
        WHERE tipo = 'RECEITA'
          AND categoria_id IN (
            SELECT id FROM categorias_financeiras 
            WHERE dre_grupo = 'OUTRAS'
          )
          AND data_lancamento BETWEEN ? AND ?
          AND status != 'CANCELADO'
      `, [data_inicio, data_fim]);

      // 12. RESULTADO LÍQUIDO
      const resultadoLiquido = lucroOperacional + resultadoFinanceiro + outrasReceitas[0].valor;

      // 13. MARGENS
      const margemBruta = receitaBruta[0].valor > 0 ? (lucroBruto / receitaBruta[0].valor) * 100 : 0;
      const margemOperacional = receitaBruta[0].valor > 0 ? (lucroOperacional / receitaBruta[0].valor) * 100 : 0;
      const margemLiquida = receitaBruta[0].valor > 0 ? (resultadoLiquido / receitaBruta[0].valor) * 100 : 0;

      // Montar DRE estruturado
      const dre = {
        periodo: { data_inicio, data_fim },
        
        receita_bruta: {
          valor: parseFloat(receitaBruta[0].valor),
          percentual: 100
        },
        
        deducoes: {
          valor: parseFloat(deducoes[0].valor),
          percentual: receitaBruta[0].valor > 0 ? (deducoes[0].valor / receitaBruta[0].valor) * 100 : 0
        },
        
        receita_liquida: {
          valor: parseFloat(receitaLiquida),
          percentual: receitaBruta[0].valor > 0 ? (receitaLiquida / receitaBruta[0].valor) * 100 : 0
        },
        
        cmv: {
          valor: parseFloat(cmv[0].valor),
          percentual: receitaBruta[0].valor > 0 ? (cmv[0].valor / receitaBruta[0].valor) * 100 : 0
        },
        
        lucro_bruto: {
          valor: parseFloat(lucroBruto),
          percentual: margemBruta,
          margem: margemBruta
        },
        
        despesas_operacionais: {
          detalhes: despesasOperacionais.map(d => ({
            categoria: d.categoria,
            codigo: d.codigo,
            valor: parseFloat(d.valor),
            percentual: receitaBruta[0].valor > 0 ? (d.valor / receitaBruta[0].valor) * 100 : 0
          })),
          total: parseFloat(totalDespesasOperacionais),
          percentual: receitaBruta[0].valor > 0 ? (totalDespesasOperacionais / receitaBruta[0].valor) * 100 : 0
        },
        
        lucro_operacional: {
          valor: parseFloat(lucroOperacional),
          percentual: margemOperacional,
          margem: margemOperacional
        },
        
        resultado_financeiro: {
          receitas: parseFloat(receitasFinanceiras[0].valor),
          despesas: parseFloat(despesasFinanceiras[0].valor),
          resultado: parseFloat(resultadoFinanceiro),
          percentual: receitaBruta[0].valor > 0 ? (resultadoFinanceiro / receitaBruta[0].valor) * 100 : 0
        },
        
        outras_receitas: {
          valor: parseFloat(outrasReceitas[0].valor),
          percentual: receitaBruta[0].valor > 0 ? (outrasReceitas[0].valor / receitaBruta[0].valor) * 100 : 0
        },
        
        resultado_liquido: {
          valor: parseFloat(resultadoLiquido),
          percentual: margemLiquida,
          margem: margemLiquida
        },
        
        indicadores: {
          margem_bruta: margemBruta,
          margem_operacional: margemOperacional,
          margem_liquida: margemLiquida,
          status: resultadoLiquido >= 0 ? 'LUCRO' : 'PREJUIZO'
        }
      };

      res.json({ dre });

    } catch (error) {
      console.error('Erro ao gerar DRE:', error);
      res.status(500).json({ error: 'Erro ao gerar DRE' });
    }
  },

  /**
   * Comparar DRE entre períodos
   * @route GET /api/dre/comparar
   */
  async compararPeriodos(req, res) {
    try {
      const { periodo1_inicio, periodo1_fim, periodo2_inicio, periodo2_fim } = req.query;

      if (!periodo1_inicio || !periodo1_fim || !periodo2_inicio || !periodo2_fim) {
        return res.status(400).json({ error: 'Dois períodos completos obrigatórios' });
      }

      // Gerar DRE para cada período (simplificado)
      const calcularDRESimples = async (inicio, fim) => {
        const [receitas] = await db.query(`
          SELECT COALESCE(SUM(valor), 0) as total
          FROM lancamentos_financeiros
          WHERE tipo = 'RECEITA' AND data_lancamento BETWEEN ? AND ? AND status != 'CANCELADO'
        `, [inicio, fim]);

        const [despesas] = await db.query(`
          SELECT COALESCE(SUM(valor), 0) as total
          FROM lancamentos_financeiros
          WHERE tipo = 'DESPESA' AND data_lancamento BETWEEN ? AND ? AND status != 'CANCELADO'
        `, [inicio, fim]);

        return {
          receitas: parseFloat(receitas[0].total),
          despesas: parseFloat(despesas[0].total),
          resultado: parseFloat(receitas[0].total) - parseFloat(despesas[0].total)
        };
      };

      const periodo1 = await calcularDRESimples(periodo1_inicio, periodo1_fim);
      const periodo2 = await calcularDRESimples(periodo2_inicio, periodo2_fim);

      const comparacao = {
        periodo1: { inicio: periodo1_inicio, fim: periodo1_fim, ...periodo1 },
        periodo2: { inicio: periodo2_inicio, fim: periodo2_fim, ...periodo2 },
        variacao: {
          receitas: periodo2.receitas - periodo1.receitas,
          receitas_percentual: periodo1.receitas > 0 ? ((periodo2.receitas - periodo1.receitas) / periodo1.receitas) * 100 : 0,
          despesas: periodo2.despesas - periodo1.despesas,
          despesas_percentual: periodo1.despesas > 0 ? ((periodo2.despesas - periodo1.despesas) / periodo1.despesas) * 100 : 0,
          resultado: periodo2.resultado - periodo1.resultado,
          resultado_percentual: periodo1.resultado !== 0 ? ((periodo2.resultado - periodo1.resultado) / Math.abs(periodo1.resultado)) * 100 : 0
        }
      };

      res.json({ comparacao });

    } catch (error) {
      console.error('Erro ao comparar períodos:', error);
      res.status(500).json({ error: 'Erro ao comparar períodos' });
    }
  },

  /**
   * Listar categorias financeiras
   * @route GET /api/dre/categorias
   */
  async listarCategorias(req, res) {
    try {
      const { tipo } = req.query;

      let whereClause = 'WHERE ativa = TRUE';
      const params = [];

      if (tipo) {
        whereClause += ' AND tipo = ?';
        params.push(tipo);
      }

      const [categorias] = await db.query(`
        SELECT 
          c.*,
          cp.nome as categoria_pai_nome
        FROM categorias_financeiras c
        LEFT JOIN categorias_financeiras cp ON c.categoria_pai_id = cp.id
        ${whereClause}
        ORDER BY c.tipo, c.nivel, c.codigo
      `, params);

      res.json({ categorias });

    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({ error: 'Erro ao listar categorias' });
    }
  }
};

module.exports = DREController;
