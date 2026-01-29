const db = require('../db');

/**
 * Controller para Balancete de Verificação
 * Gera balancete contábil com saldos e movimentações por categoria
 */

const BalanceteController = {
  /**
   * Gerar Balancete por período
   * @route GET /api/balancete
   */
  async gerarBalancete(req, res) {
    try {
      const { data_inicio, data_fim, tipo } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Período obrigatório (data_inicio e data_fim)' });
      }

      // Buscar todas as categorias ativas
      let whereCategoria = 'WHERE c.ativa = TRUE';
      const params = [data_inicio, data_fim];

      if (tipo) {
        whereCategoria += ' AND c.tipo = ?';
        params.push(tipo);
      }

      // Buscar movimentações por categoria
      const [movimentacoes] = await db.query(`
        SELECT 
          c.id,
          c.codigo,
          c.nome,
          c.tipo,
          c.nivel,
          c.dre_grupo,
          COALESCE(SUM(CASE 
            WHEN l.tipo = 'DESPESA' THEN l.valor 
            ELSE 0 
          END), 0) as debito,
          COALESCE(SUM(CASE 
            WHEN l.tipo = 'RECEITA' THEN l.valor 
            ELSE 0 
          END), 0) as credito,
          COUNT(l.id) as qtd_lancamentos
        FROM categorias_financeiras c
        LEFT JOIN lancamentos_financeiros l ON l.categoria_id = c.id
          AND l.data_lancamento BETWEEN ? AND ?
          AND l.status != 'CANCELADO'
        ${whereCategoria}
        GROUP BY c.id, c.codigo, c.nome, c.tipo, c.nivel, c.dre_grupo
        ORDER BY c.tipo, c.codigo, c.nivel
      `, params);

      // Organizar por tipo
      const receitas = [];
      const despesas = [];
      const custos = [];

      let totalDebitos = 0;
      let totalCreditos = 0;

      movimentacoes.forEach(mov => {
        const debito = parseFloat(mov.debito);
        const credito = parseFloat(mov.credito);
        const saldo = credito - debito;

        totalDebitos += debito;
        totalCreditos += credito;

        const item = {
          id: mov.id,
          codigo: mov.codigo,
          nome: mov.nome,
          nivel: mov.nivel,
          dre_grupo: mov.dre_grupo,
          debito: debito,
          credito: credito,
          saldo: saldo,
          qtd_lancamentos: mov.qtd_lancamentos
        };

        if (mov.tipo === 'RECEITA') {
          receitas.push(item);
        } else if (mov.tipo === 'DESPESA') {
          despesas.push(item);
        } else if (mov.tipo === 'CUSTO') {
          custos.push(item);
        }
      });

      // Calcular totais por tipo
      const totalReceitas = receitas.reduce((sum, r) => sum + r.credito, 0);
      const totalDespesasValor = despesas.reduce((sum, d) => sum + d.debito, 0);
      const totalCustos = custos.reduce((sum, c) => sum + c.debito, 0);
      const saldoLiquido = totalCreditos - totalDebitos;

      const balancete = {
        periodo: { data_inicio, data_fim },
        resumo: {
          total_debitos: totalDebitos,
          total_creditos: totalCreditos,
          total_receitas: totalReceitas,
          total_despesas: totalDespesasValor,
          total_custos: totalCustos,
          saldo_liquido: saldoLiquido,
          status: saldoLiquido >= 0 ? 'POSITIVO' : 'NEGATIVO'
        },
        contas: {
          receitas: receitas,
          despesas: despesas,
          custos: custos
        },
        totais_por_tipo: {
          receitas: {
            debitos: receitas.reduce((sum, r) => sum + r.debito, 0),
            creditos: receitas.reduce((sum, r) => sum + r.credito, 0),
            saldo: receitas.reduce((sum, r) => sum + r.saldo, 0)
          },
          despesas: {
            debitos: despesas.reduce((sum, d) => sum + d.debito, 0),
            creditos: despesas.reduce((sum, d) => sum + d.credito, 0),
            saldo: despesas.reduce((sum, d) => sum + d.saldo, 0)
          },
          custos: {
            debitos: custos.reduce((sum, c) => sum + c.debito, 0),
            creditos: custos.reduce((sum, c) => sum + c.credito, 0),
            saldo: custos.reduce((sum, c) => sum + c.saldo, 0)
          }
        }
      };

      res.json({ balancete });

    } catch (error) {
      console.error('Erro ao gerar balancete:', error);
      res.status(500).json({ error: 'Erro ao gerar balancete: ' + error.message });
    }
  }
};

module.exports = BalanceteController;
