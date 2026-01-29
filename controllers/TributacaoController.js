// controllers/TributacaoController.js
const pool = require('../src/config/db');
const { resolveFiguraSaida, montarCamposItemSaida, normalizeNcm } = require('../utils/tributacaoResolver');

class TributacaoController {
  // Figuras de Entrada
  static async listarFigurasEntrada(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM trib_figuras_entrada ORDER BY nome');
      res.json({ figuras: rows });
    } catch (err) {
      console.error('Erro listar figuras entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async criarFiguraEntrada(req, res) {
    try {
      const data = req.body || {};
      const fields = ['nome','descricao','cfop','origem','cst_icms','csosn','icms_modalidade','icms_aliquota','icms_reducao_bc','fcp_aliquota','ipi_cst','ipi_aliquota','pis_cst','pis_aliquota','cofins_cst','cofins_aliquota','ativo'];
      const cols = [];
      const vals = [];
      const ph = [];
      fields.forEach(f => { if (data[f] !== undefined) { cols.push(f); vals.push(data[f]); ph.push('?'); } });
      if (!cols.includes('nome')) return res.status(400).json({ error: 'nome é obrigatório' });
      const [r] = await pool.query(`INSERT INTO trib_figuras_entrada (${cols.join(',')}) VALUES (${ph.join(',')})`, vals);
      const [row] = await pool.query('SELECT * FROM trib_figuras_entrada WHERE id = ?', [r.insertId]);
      res.status(201).json(row[0]);
    } catch (err) {
      console.error('Erro criar figura entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async atualizarFiguraEntrada(req, res) {
    try {
      const { id } = req.params;
      const data = req.body || {};
      const fields = ['nome','descricao','cfop','origem','cst_icms','csosn','icms_modalidade','icms_aliquota','icms_reducao_bc','fcp_aliquota','ipi_cst','ipi_aliquota','pis_cst','pis_aliquota','cofins_cst','cofins_aliquota','ativo'];
      const sets = [];
      const vals = [];
      fields.forEach(f => { if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); } });
      if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
      vals.push(id);
      await pool.query(`UPDATE trib_figuras_entrada SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, vals);
      const [row] = await pool.query('SELECT * FROM trib_figuras_entrada WHERE id = ?', [id]);
      res.json(row[0]);
    } catch (err) {
      console.error('Erro atualizar figura entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async excluirFiguraEntrada(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM trib_figuras_entrada WHERE id = ?', [id]);
      res.json({ message: 'Figura de entrada removida' });
    } catch (err) {
      console.error('Erro excluir figura entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  // NCM mappings - Entrada
  static async listarNcmEntrada(req, res) {
    try {
      const { id } = req.params; // figura_entrada_id
      const [rows] = await pool.query('SELECT * FROM trib_entrada_ncm_map WHERE figura_entrada_id = ? ORDER BY ncm_pattern', [id]);
      res.json({ ncm: rows });
    } catch (err) {
      console.error('Erro listar NCM entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async adicionarNcmEntrada(req, res) {
    try {
      const { id } = req.params; // figura_entrada_id
      const { ncm_pattern, observacao } = req.body || {};
      if (!ncm_pattern) return res.status(400).json({ error: 'ncm_pattern é obrigatório (8 dígitos ou padrão com *)' });
      await pool.query('INSERT INTO trib_entrada_ncm_map (figura_entrada_id, ncm_pattern, observacao) VALUES (?, ?, ?)', [id, ncm_pattern, observacao || null]);
      const [rows] = await pool.query('SELECT * FROM trib_entrada_ncm_map WHERE figura_entrada_id = ? ORDER BY id DESC LIMIT 1', [id]);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'NCM já mapeado para esta figura' });
      console.error('Erro adicionar NCM entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async removerNcmEntrada(req, res) {
    try {
      const { id, mapId } = req.params;
      await pool.query('DELETE FROM trib_entrada_ncm_map WHERE figura_entrada_id = ? AND id = ?', [id, mapId]);
      res.json({ message: 'Mapeamento removido' });
    } catch (err) {
      console.error('Erro remover NCM entrada:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  // Figuras de Saída
  static async listarFigurasSaida(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM trib_figuras_saida ORDER BY nome');
      res.json({ figuras: rows });
    } catch (err) {
      console.error('Erro listar figuras saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async criarFiguraSaida(req, res) {
    try {
      const data = req.body || {};
      const fields = ['nome','descricao','cfop','origem','cst_icms','csosn','icms_modalidade','icms_aliquota','icms_reducao_bc','fcp_aliquota','ipi_cst','ipi_aliquota','pis_cst','pis_aliquota','cofins_cst','cofins_aliquota','ativo'];
      const cols = [];
      const vals = [];
      const ph = [];
      fields.forEach(f => { if (data[f] !== undefined) { cols.push(f); vals.push(data[f]); ph.push('?'); } });
      if (!cols.includes('nome')) return res.status(400).json({ error: 'nome é obrigatório' });
      const [r] = await pool.query(`INSERT INTO trib_figuras_saida (${cols.join(',')}) VALUES (${ph.join(',')})`, vals);
      const [row] = await pool.query('SELECT * FROM trib_figuras_saida WHERE id = ?', [r.insertId]);
      res.status(201).json(row[0]);
    } catch (err) {
      console.error('Erro criar figura saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async atualizarFiguraSaida(req, res) {
    try {
      const { id } = req.params;
      const data = req.body || {};
      const fields = ['nome','descricao','cfop','origem','cst_icms','csosn','icms_modalidade','icms_aliquota','icms_reducao_bc','fcp_aliquota','ipi_cst','ipi_aliquota','pis_cst','pis_aliquota','cofins_cst','cofins_aliquota','ativo'];
      const sets = [];
      const vals = [];
      fields.forEach(f => { if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); } });
      if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
      vals.push(id);
      await pool.query(`UPDATE trib_figuras_saida SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, vals);
      const [row] = await pool.query('SELECT * FROM trib_figuras_saida WHERE id = ?', [id]);
      res.json(row[0]);
    } catch (err) {
      console.error('Erro atualizar figura saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async excluirFiguraSaida(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM trib_figuras_saida WHERE id = ?', [id]);
      res.json({ message: 'Figura de saída removida' });
    } catch (err) {
      console.error('Erro excluir figura saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  // NCM mappings - Saída
  static async listarNcmSaida(req, res) {
    try {
      const { id } = req.params; // figura_saida_id
      const [rows] = await pool.query('SELECT * FROM trib_saida_ncm_map WHERE figura_saida_id = ? ORDER BY ncm_pattern', [id]);
      res.json({ ncm: rows });
    } catch (err) {
      console.error('Erro listar NCM saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async adicionarNcmSaida(req, res) {
    try {
      const { id } = req.params; // figura_saida_id
      const { ncm_pattern, observacao } = req.body || {};
      if (!ncm_pattern) return res.status(400).json({ error: 'ncm_pattern é obrigatório (8 dígitos ou padrão com *)' });
      await pool.query('INSERT INTO trib_saida_ncm_map (figura_saida_id, ncm_pattern, observacao) VALUES (?, ?, ?)', [id, ncm_pattern, observacao || null]);
      const [rows] = await pool.query('SELECT * FROM trib_saida_ncm_map WHERE figura_saida_id = ? ORDER BY id DESC LIMIT 1', [id]);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'NCM já mapeado para esta figura' });
      console.error('Erro adicionar NCM saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async removerNcmSaida(req, res) {
    try {
      const { id, mapId } = req.params;
      await pool.query('DELETE FROM trib_saida_ncm_map WHERE figura_saida_id = ? AND id = ?', [id, mapId]);
      res.json({ message: 'Mapeamento removido' });
    } catch (err) {
      console.error('Erro remover NCM saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  // Vínculos de produto
  static async obterFigurasProduto(req, res) {
    try {
      const { produtoId } = req.params;
      const [[ent]] = await pool.query('SELECT p.produto_id, p.figura_entrada_id, f.nome AS figura_entrada_nome FROM produtos_trib_entrada p LEFT JOIN trib_figuras_entrada f ON f.id = p.figura_entrada_id WHERE p.produto_id = ?', [produtoId]);
      const [[sai]] = await pool.query('SELECT p.produto_id, p.figura_saida_id, f.nome AS figura_saida_nome FROM produtos_trib_saida p LEFT JOIN trib_figuras_saida f ON f.id = p.figura_saida_id WHERE p.produto_id = ?', [produtoId]);
      res.json({ produto_id: parseInt(produtoId, 10), figura_entrada: ent || null, figura_saida: sai || null });
    } catch (err) {
      console.error('Erro obter figuras produto:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  static async atribuirFigurasProduto(req, res) {
    try {
      const { produtoId } = req.params;
      const { figura_entrada_id = null, figura_saida_id = null } = req.body || {};

      if (figura_entrada_id !== undefined) {
        if (figura_entrada_id === null) {
          await pool.query('DELETE FROM produtos_trib_entrada WHERE produto_id = ?', [produtoId]);
        } else {
          await pool.query('INSERT INTO produtos_trib_entrada (produto_id, figura_entrada_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE figura_entrada_id = VALUES(figura_entrada_id)', [produtoId, figura_entrada_id]);
        }
      }

      if (figura_saida_id !== undefined) {
        if (figura_saida_id === null) {
          await pool.query('DELETE FROM produtos_trib_saida WHERE produto_id = ?', [produtoId]);
        } else {
          await pool.query('INSERT INTO produtos_trib_saida (produto_id, figura_saida_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE figura_saida_id = VALUES(figura_saida_id)', [produtoId, figura_saida_id]);
        }
      }

      return TributacaoController.obterFigurasProduto(req, res);
    } catch (err) {
      console.error('Erro atribuir figuras produto:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }

  // Preview/Diagnóstico: resolve figura de saída e campos fiscais sem gravar nada
  static async previewResolverSaida(req, res) {
    try {
      let { produtoId, ncm } = req.query || {};
      if (produtoId !== undefined && produtoId !== null && produtoId !== '') {
        produtoId = parseInt(produtoId, 10);
        if (Number.isNaN(produtoId)) return res.status(400).json({ error: 'produtoId inválido' });
      } else {
        produtoId = null;
      }

      ncm = normalizeNcm(ncm || null);
      if (!produtoId && !ncm) {
        return res.status(400).json({ error: 'Informe ao menos produtoId ou ncm' });
      }

      const [cfgRows] = await pool.execute('SELECT regime_tributario FROM configuracoes_fiscais WHERE ativo = TRUE LIMIT 1');
      const regime = (cfgRows && cfgRows[0] && cfgRows[0].regime_tributario) || 'SIMPLES_NACIONAL';

      const resolvido = await resolveFiguraSaida(pool, produtoId, ncm);
      const campos = resolvido?.figura ? montarCamposItemSaida(resolvido.figura, regime) : {
        cfop: '5102',
        origem_produto: 0,
        cst_icms: '102',
        aliquota_icms: 0,
        pis_cst: '49',
        pis_aliquota: 0,
        cofins_cst: '49',
        cofins_aliquota: 0,
      };

      return res.json({
        input: { produtoId, ncm },
        regime_tributario: regime,
        decisao: {
          origem: resolvido?.origem || 'none',
          figura: resolvido?.figura || null,
          matched_pattern: resolvido?.matched_pattern || null,
        },
        campos_aplicados: campos,
      });
    } catch (err) {
      console.error('Erro preview resolver saída:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  }
}

module.exports = TributacaoController;
