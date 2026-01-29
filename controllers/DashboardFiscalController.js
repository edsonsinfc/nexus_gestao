const db = require('../db');

const DashboardFiscalController = {
  /**
   * Estatísticas fiscais consolidadas
   * @route GET /api/dashboard-fiscal
   */
  async gerarDashboard(req, res) {
    try {
      const { data_inicio, data_fim } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Período obrigatório' });
      }

      // 1. TOTALIZADORES NFC-e
      let totaisNFCe = [{ quantidade: 0, valor_total: 0, base_icms: 0, valor_icms: 0 }];
      try {
        const resultado = await db.query(`
          SELECT 
            COUNT(*) as quantidade,
            COALESCE(SUM(valor_total), 0) as valor_total,
            COALESCE(SUM(base_icms), 0) as base_icms,
            COALESCE(SUM(valor_icms), 0) as valor_icms
          FROM nfce
          WHERE data_emissao BETWEEN ? AND ?
            AND status_nfce = 'AUTORIZADA'
        `, [data_inicio, data_fim]);
        totaisNFCe = resultado[0];
      } catch (err) {
        console.log('⚠️ Tabela nfce não existe ou erro na query:', err.message);
      }

      // 2. TOTALIZADORES NF-e
      let totaisNFe = [{ quantidade: 0, valor_total: 0 }];
      try {
        const resultado = await db.query(`
          SELECT 
            COUNT(*) as quantidade,
            COALESCE(SUM(valor_total_nfe), 0) as valor_total
          FROM nfe_saida
          WHERE data_emissao BETWEEN ? AND ?
            AND status = 'AUTORIZADA'
        `, [data_inicio, data_fim]);
        totaisNFe = resultado[0];
      } catch (err) {
        console.log('⚠️ Tabela nfe_saida não existe ou erro na query:', err.message);
      }

      // 3. DISTRIBUIÇÃO POR CFOP (NFC-e)
      let cfopsNFCe = [];
      try {
        const resultado = await db.query(`
          SELECT 
            i.cfop,
            COUNT(DISTINCT n.id) as quantidade_notas,
            COALESCE(SUM(i.valor_total_item), 0) as valor_total,
            COALESCE(SUM(i.base_icms), 0) as base_icms,
            COALESCE(SUM(i.valor_icms), 0) as valor_icms
          FROM nfce n
          JOIN nfce_itens_fiscal i ON n.id = i.nfce_id
          WHERE n.data_emissao BETWEEN ? AND ?
            AND n.status_nfce = 'AUTORIZADA'
          GROUP BY i.cfop
          ORDER BY valor_total DESC
        `, [data_inicio, data_fim]);
        cfopsNFCe = resultado[0];
      } catch (err) {
        console.log('⚠️ Erro ao buscar CFOPs:', err.message);
      }

      // 4. DISTRIBUIÇÃO POR SITUAÇÃO TRIBUTÁRIA
      let situacoesTributarias = [];
      try {
        const resultado = await db.query(`
          SELECT 
            i.situacao_tributaria as cst,
            COUNT(DISTINCT n.id) as quantidade_notas,
            COUNT(i.id) as quantidade_itens,
            COALESCE(SUM(i.valor_total_item), 0) as valor_total,
            COALESCE(SUM(i.base_icms), 0) as base_icms,
            COALESCE(SUM(i.valor_icms), 0) as valor_icms,
            COALESCE(SUM(i.base_icms_st), 0) as base_icms_st,
            COALESCE(SUM(i.valor_icms_st), 0) as valor_icms_st
          FROM nfce n
          JOIN nfce_itens_fiscal i ON n.id = i.nfce_id
          WHERE n.data_emissao BETWEEN ? AND ?
            AND n.status_nfce = 'AUTORIZADA'
          GROUP BY i.situacao_tributaria
          ORDER BY valor_total DESC
        `, [data_inicio, data_fim]);
        situacoesTributarias = resultado[0];
      } catch (err) {
        console.log('⚠️ Erro ao buscar situações tributárias:', err.message);
      }

      // 5. EVOLUÇÃO DIÁRIA
      let evolucaoDiaria = [];
      try {
        const resultado = await db.query(`
          SELECT 
            DATE(data_emissao) as data,
            COUNT(*) as quantidade_notas,
            COALESCE(SUM(valor_total), 0) as valor_total
          FROM nfce
          WHERE data_emissao BETWEEN ? AND ?
            AND status_nfce = 'AUTORIZADA'
          GROUP BY DATE(data_emissao)
          ORDER BY data
        `, [data_inicio, data_fim]);
        evolucaoDiaria = resultado[0];
      } catch (err) {
        console.log('⚠️ Erro ao buscar evolução diária:', err.message);
      }

      // 6. TOP 10 PRODUTOS MAIS VENDIDOS
      let topProdutos = [];
      try {
        const resultado = await db.query(`
          SELECT 
            i.codigo_produto,
            i.descricao_produto,
            SUM(i.quantidade) as quantidade_total,
            COALESCE(SUM(i.valor_total_item), 0) as valor_total,
            COUNT(DISTINCT i.nfce_id) as numero_vendas
          FROM nfce n
          JOIN nfce_itens_fiscal i ON n.id = i.nfce_id
          WHERE n.data_emissao BETWEEN ? AND ?
            AND n.status_nfce = 'AUTORIZADA'
          GROUP BY i.codigo_produto, i.descricao_produto
          ORDER BY quantidade_total DESC
          LIMIT 10
        `, [data_inicio, data_fim]);
        topProdutos = resultado[0];
      } catch (err) {
        console.log('⚠️ Erro ao buscar top produtos:', err.message);
      }

      // 7. FORMAS DE PAGAMENTO
      let formasPagamento = [];
      try {
        const resultado = await db.query(`
          SELECT 
            forma_pagamento,
            COUNT(*) as quantidade_notas,
            COALESCE(SUM(valor_total), 0) as valor_total
          FROM nfce
          WHERE data_emissao BETWEEN ? AND ?
            AND status_nfce = 'AUTORIZADA'
          GROUP BY forma_pagamento
          ORDER BY valor_total DESC
        `, [data_inicio, data_fim]);
        formasPagamento = resultado[0];
      } catch (err) {
        console.log('⚠️ Erro ao buscar formas de pagamento:', err.message);
      }

      // 8. ALÍQUOTAS ICMS PRATICADAS
      let aliquotas = [];
      try {
        const resultado = await db.query(`
          SELECT 
            i.aliquota_icms,
            COUNT(i.id) as quantidade_itens,
            COALESCE(SUM(i.valor_icms), 0) as valor_icms_total
          FROM nfce n
          JOIN nfce_itens_fiscal i ON n.id = i.nfce_id
          WHERE n.data_emissao BETWEEN ? AND ?
            AND n.status_nfce = 'AUTORIZADA'
            AND i.aliquota_icms > 0
          GROUP BY i.aliquota_icms
          ORDER BY quantidade_itens DESC
        `, [data_inicio, data_fim]);
        aliquotas = resultado[0];
      } catch (err) {
        console.log('⚠️ Erro ao buscar alíquotas ICMS:', err.message);
      }

      const dashboard = {
        periodo: { data_inicio, data_fim },
        
        totalizadores: {
          nfce: {
            quantidade: totaisNFCe[0]?.quantidade || 0,
            valor_total: parseFloat(totaisNFCe[0]?.valor_total || 0),
            base_icms: parseFloat(totaisNFCe[0]?.base_icms || 0),
            valor_icms: parseFloat(totaisNFCe[0]?.valor_icms || 0)
          },
          nfe: {
            quantidade: totaisNFe[0]?.quantidade || 0,
            valor_total: parseFloat(totaisNFe[0]?.valor_total || 0)
          },
          geral: {
            quantidade: (totaisNFCe[0]?.quantidade || 0) + (totaisNFe[0]?.quantidade || 0),
            valor_total: parseFloat(totaisNFCe[0]?.valor_total || 0) + parseFloat(totaisNFe[0]?.valor_total || 0)
          }
        },
        
        cfops: (cfopsNFCe || []).map(c => ({
          cfop: c.cfop,
          quantidade_notas: parseInt(c.quantidade_notas),
          valor_total: parseFloat(c.valor_total),
          base_icms: parseFloat(c.base_icms),
          valor_icms: parseFloat(c.valor_icms)
        })),
        
        situacoes_tributarias: (situacoesTributarias || []).map(st => ({
          cst: st.cst,
          quantidade_notas: parseInt(st.quantidade_notas),
          quantidade_itens: parseInt(st.quantidade_itens),
          valor_total: parseFloat(st.valor_total),
          base_icms: parseFloat(st.base_icms),
          valor_icms: parseFloat(st.valor_icms),
          base_icms_st: parseFloat(st.base_icms_st),
          valor_icms_st: parseFloat(st.valor_icms_st)
        })),
        
        evolucao_diaria: (evolucaoDiaria || []).map(e => ({
          data: e.data,
          quantidade_notas: parseInt(e.quantidade_notas),
          valor_total: parseFloat(e.valor_total)
        })),
        
        top_produtos: (topProdutos || []).map(p => ({
          codigo: p.codigo_produto,
          descricao: p.descricao_produto,
          quantidade: parseFloat(p.quantidade_total),
          valor_total: parseFloat(p.valor_total),
          numero_vendas: parseInt(p.numero_vendas)
        })),
        
        formas_pagamento: (formasPagamento || []).map(f => ({
          forma: f.forma_pagamento,
          quantidade: parseInt(f.quantidade_notas),
          valor_total: parseFloat(f.valor_total)
        })),
        
        aliquotas_icms: (aliquotas || []).map(a => ({
          aliquota: parseFloat(a.aliquota_icms),
          quantidade_itens: parseInt(a.quantidade_itens),
          valor_icms: parseFloat(a.valor_icms_total)
        }))
      };

      res.json({ dashboard });

    } catch (error) {
      console.error('❌ Erro ao gerar dashboard fiscal:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        error: 'Erro ao gerar dashboard fiscal',
        detalhes: error.message,
        sql: error.sql
      });
    }
  },

  /**
   * Atualizar cache de estatísticas (job mensal)
   * @route POST /api/dashboard-fiscal/atualizar-cache
   */
  async atualizarCache(req, res) {
    try {
      const { mes, ano } = req.body;

      if (!mes || !ano) {
        return res.status(400).json({ error: 'Mês e ano obrigatórios' });
      }

      const periodo_mes = parseInt(`${ano}${mes.toString().padStart(2, '0')}`);
      const data_inicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const data_fim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;

      // Limpar cache do mês
      await db.query('DELETE FROM estatisticas_fiscais_cache WHERE periodo_mes = ?', [periodo_mes]);

      // Agregar estatísticas por CFOP e CST
      const [estatisticas] = await db.query(`
        SELECT 
          'NFCE' as tipo_documento,
          i.cfop,
          i.situacao_tributaria,
          COUNT(DISTINCT n.id) as quantidade_notas,
          COALESCE(SUM(i.valor_total_item), 0) as valor_total,
          COALESCE(SUM(i.base_icms), 0) as base_calculo_icms,
          COALESCE(SUM(i.valor_icms), 0) as valor_icms,
          COALESCE(SUM(i.base_icms_st), 0) as base_calculo_st,
          COALESCE(SUM(i.valor_icms_st), 0) as valor_icms_st
        FROM nfce n
        JOIN nfce_itens i ON n.id = i.nfce_id
        WHERE n.data_emissao BETWEEN ? AND ?
          AND n.status_nfce = 'AUTORIZADA'
        GROUP BY i.cfop, i.situacao_tributaria
      `, [data_inicio, data_fim]);

      // Inserir no cache
      for (const stat of estatisticas) {
        await db.query(`
          INSERT INTO estatisticas_fiscais_cache (
            periodo_mes, tipo_documento, cfop, situacao_tributaria,
            quantidade_notas, valor_total, base_calculo_icms, valor_icms,
            base_calculo_st, valor_icms_st
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          periodo_mes, stat.tipo_documento, stat.cfop, stat.situacao_tributaria,
          stat.quantidade_notas, stat.valor_total, stat.base_calculo_icms, stat.valor_icms,
          stat.base_calculo_st, stat.valor_icms_st
        ]);
      }

      res.json({
        message: 'Cache atualizado com sucesso',
        periodo: `${mes}/${ano}`,
        registros_inseridos: estatisticas.length
      });

    } catch (error) {
      console.error('Erro ao atualizar cache:', error);
      res.status(500).json({ error: 'Erro ao atualizar cache de estatísticas' });
    }
  },

  /**
   * Relatório fiscal para SPED/SINTEGRA
   * @route GET /api/dashboard-fiscal/relatorio-sped
   */
  async relatorioSPED(req, res) {
    try {
      const { data_inicio, data_fim } = req.query;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'Período obrigatório' });
      }

      // Dados para geração de SPED
      const [registrosC100] = await db.query(`
        SELECT 
          n.numero_nfce,
          n.serie,
          DATE_FORMAT(n.data_emissao, '%d%m%Y') as data_emissao,
          n.chave_acesso,
          n.valor_total,
          n.base_icms,
          n.valor_icms,
          'SAIDA' as tipo_operacao
        FROM nfce n
        WHERE n.data_emissao BETWEEN ? AND ?
          AND n.status_nfce = 'AUTORIZADA'
        ORDER BY n.data_emissao, n.numero_nfce
      `, [data_inicio, data_fim]);

      const [registrosC170] = await db.query(`
        SELECT 
          n.numero_nfce,
          i.codigo_produto,
          i.descricao_produto,
          i.quantidade,
          i.valor_unitario,
          i.valor_total_item,
          i.cfop,
          i.situacao_tributaria,
          i.base_icms,
          i.aliquota_icms,
          i.valor_icms
        FROM nfce n
        JOIN nfce_itens i ON n.id = i.nfce_id
        WHERE n.data_emissao BETWEEN ? AND ?
          AND n.status_nfce = 'AUTORIZADA'
        ORDER BY n.numero_nfce, i.id
      `, [data_inicio, data_fim]);

      res.json({
        periodo: { data_inicio, data_fim },
        registros_c100: registrosC100,
        registros_c170: registrosC170,
        total_documentos: registrosC100.length
      });

    } catch (error) {
      console.error('Erro ao gerar relatório SPED:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório SPED' });
    }
  }
};

module.exports = DashboardFiscalController;
