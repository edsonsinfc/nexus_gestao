// controllers/EntradasMercadoriasController.js
const db = require('../db');
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');

class EntradasMercadoriasController {

  // Listar entradas
  async listar(req, res) {
    try {
      const { 
        status, 
        tipo_entrada,
        fornecedor_id,
        data_inicio,
        data_fim,
        page = 1,
        limit = 20 
      } = req.query;

      let sql = `
        SELECT 
          em.*,
          f.razao_social as fornecedor_razao_social,
          f.nome_fantasia as fornecedor_nome_fantasia,
          u.nome as usuario_nome,
          conferente.nome as conferente_nome,
          pc.numero_pedido,
          nfe.numero_nfe,
          nfe.chave_acesso,
          (SELECT COUNT(*) FROM entradas_mercadorias_itens WHERE entrada_mercadoria_id = em.id) as total_itens
        FROM entradas_mercadorias em
        LEFT JOIN fornecedores f ON em.fornecedor_id = f.id
        LEFT JOIN usuarios u ON em.usuario_id = u.id
        LEFT JOIN usuarios conferente ON em.conferido_por_id = conferente.id
        LEFT JOIN pedidos_compra pc ON em.pedido_compra_id = pc.id
        LEFT JOIN nfe_entrada nfe ON em.nfe_entrada_id = nfe.id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        sql += ' AND em.status = ?';
        params.push(status);
      }

      if (tipo_entrada) {
        sql += ' AND em.tipo_entrada = ?';
        params.push(tipo_entrada);
      }

      if (fornecedor_id) {
        sql += ' AND em.fornecedor_id = ?';
        params.push(fornecedor_id);
      }

      if (data_inicio) {
        sql += ' AND em.data_entrada >= ?';
        params.push(data_inicio);
      }

      if (data_fim) {
        sql += ' AND em.data_entrada <= ?';
        params.push(data_fim);
      }

      sql += ' ORDER BY em.created_at DESC';

      const offset = (page - 1) * limit;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [entradas] = await db.query(sql, params);

      // Contar total
      let sqlCount = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      sqlCount = sqlCount.replace(/LIMIT.*/, '');
      const [countResult] = await db.query(sqlCount, params.slice(0, -2));

      res.json({
        entradas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar entradas:', error);
      res.status(500).json({ error: 'Erro ao listar entradas de mercadorias' });
    }
  }

  // Buscar entrada por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const [entradas] = await db.query(`
        SELECT 
          em.*,
          f.*,
          f.id as fornecedor_id,
          u.nome as usuario_nome,
          conferente.nome as conferente_nome,
          pc.numero_pedido,
          pc.id as pedido_id,
          nfe.numero_nfe,
          nfe.chave_acesso,
          nfe.id as nfe_id
        FROM entradas_mercadorias em
        LEFT JOIN fornecedores f ON em.fornecedor_id = f.id
        LEFT JOIN usuarios u ON em.usuario_id = u.id
        LEFT JOIN usuarios conferente ON em.conferido_por_id = conferente.id
        LEFT JOIN pedidos_compra pc ON em.pedido_compra_id = pc.id
        LEFT JOIN nfe_entrada nfe ON em.nfe_entrada_id = nfe.id
        WHERE em.id = ?
      `, [id]);

      if (entradas.length === 0) {
        return res.status(404).json({ error: 'Entrada não encontrada' });
      }

      // Buscar itens
      const [itens] = await db.query(`
        SELECT 
          emi.*,
          p.codigo_principal,
          p.gtin,
          p.estoque_atual,
          pci.quantidade_solicitada as pedido_quantidade,
          pci.valor_unitario as pedido_valor_unitario,
          nei.quantidade as nfe_quantidade,
          nei.valor_unitario as nfe_valor_unitario
        FROM entradas_mercadorias_itens emi
        LEFT JOIN produtos p ON emi.produto_id = p.id
        LEFT JOIN pedidos_compra_itens pci ON emi.pedido_compra_item_id = pci.id
        LEFT JOIN nfe_entrada_itens nei ON emi.nfe_entrada_item_id = nei.id
        WHERE emi.entrada_mercadoria_id = ?
        ORDER BY emi.numero_item
      `, [id]);

      res.json({
        entrada: entradas[0],
        itens
      });

    } catch (error) {
      console.error('Erro ao buscar entrada:', error);
      res.status(500).json({ error: 'Erro ao buscar entrada' });
    }
  }

  // Criar entrada manual
  async criar(req, res) {
    try {
      const {
        fornecedor_id,
        data_entrada,
        valor_frete,
        valor_desconto,
        observacoes,
        itens
      } = req.body;

      if (!fornecedor_id) {
        return res.status(400).json({ error: 'Fornecedor é obrigatório' });
      }

      if (!itens || itens.length === 0) {
        return res.status(400).json({ error: 'Entrada deve ter pelo menos um item' });
      }

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Gerar número da entrada
        const [lastEntrada] = await connection.query(
          'SELECT numero_entrada FROM entradas_mercadorias ORDER BY id DESC LIMIT 1'
        );
        
        let numeroEntrada = 1;
        if (lastEntrada.length > 0) {
          const lastNum = parseInt(lastEntrada[0].numero_entrada.replace(/\D/g, ''));
          numeroEntrada = lastNum + 1;
        }
        numeroEntrada = `ENT${numeroEntrada.toString().padStart(6, '0')}`;

        // Calcular totais
        let valorProdutos = 0;
        for (const item of itens) {
          valorProdutos += item.quantidade * item.valor_unitario - (item.valor_desconto || 0);
        }

        const valorTotal = valorProdutos + (valor_frete || 0) - (valor_desconto || 0);

        // Criar entrada
        const [resultEntrada] = await connection.query(`
          INSERT INTO entradas_mercadorias (
            numero_entrada, tipo_entrada, origem,
            fornecedor_id, data_entrada,
            valor_produtos, valor_frete, valor_desconto, valor_total,
            observacoes, usuario_id, status
          ) VALUES (?, 'MANUAL', 'Entrada Manual', ?, ?, ?, ?, ?, ?, ?, ?, 'RASCUNHO')
        `, [
          numeroEntrada,
          fornecedor_id,
          data_entrada || new Date(),
          valorProdutos,
          valor_frete || 0,
          valor_desconto || 0,
          valorTotal,
          observacoes || null,
          req.userId
        ]);

        const entradaId = resultEntrada.insertId;

        // Inserir itens
        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          
          // Buscar dados do produto
          const [produtos] = await connection.query(
            'SELECT codigo_principal, descricao, unidade FROM produtos WHERE id = ?',
            [item.produto_id]
          );

          if (produtos.length === 0) {
            throw new Error(`Produto ${item.produto_id} não encontrado`);
          }

          const produto = produtos[0];
          const valorTotal = item.quantidade * item.valor_unitario - (item.valor_desconto || 0);

          await connection.query(`
            INSERT INTO entradas_mercadorias_itens (
              entrada_mercadoria_id, numero_item,
              produto_id, codigo_produto, descricao, unidade,
              quantidade, valor_unitario, valor_desconto, valor_total,
              lote, data_validade, data_fabricacao, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            entradaId, i + 1,
            item.produto_id, produto.codigo_principal, produto.descricao, produto.unidade,
            item.quantidade, item.valor_unitario, item.valor_desconto || 0, valorTotal,
            item.lote || null, item.data_validade || null, item.data_fabricacao || null,
            item.observacoes || null
          ]);
        }

        await connection.commit();

        res.json({
          success: true,
          message: 'Entrada criada com sucesso',
          entrada_id: entradaId,
          numero_entrada: numeroEntrada
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Erro ao criar entrada:', error);
      res.status(500).json({ error: error.message || 'Erro ao criar entrada' });
    }
  }

  // Finalizar entrada (dar baixa no estoque)
  async finalizar(req, res) {
    try {
      const { id } = req.params;

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Verificar se entrada existe
        const [entradas] = await connection.query(
          'SELECT status FROM entradas_mercadorias WHERE id = ?',
          [id]
        );

        if (entradas.length === 0) {
          throw new Error('Entrada não encontrada');
        }

        if (entradas[0].status === 'FINALIZADO') {
          throw new Error('Entrada já foi finalizada');
        }

        // Buscar itens
        const [itens] = await connection.query(
          'SELECT * FROM entradas_mercadorias_itens WHERE entrada_mercadoria_id = ?',
          [id]
        );

        // Atualizar estoque de cada produto
        for (const item of itens) {
          await connection.query(`
            UPDATE produtos 
            SET estoque_atual = estoque_atual + ?
            WHERE id = ?
          `, [item.quantidade, item.produto_id]);
        }

        // Atualizar status da entrada
        await connection.query(
          'UPDATE entradas_mercadorias SET status = \'FINALIZADO\' WHERE id = ?',
          [id]
        );

        // Se vinculado a pedido, atualizar quantidades recebidas
        const [vinculo] = await connection.query(
          'SELECT pedido_compra_id FROM entradas_mercadorias WHERE id = ?',
          [id]
        );

        if (vinculo[0].pedido_compra_id) {
          for (const item of itens) {
            if (item.pedido_compra_item_id) {
              await connection.query(`
                UPDATE pedidos_compra_itens 
                SET quantidade_recebida = quantidade_recebida + ?,
                    quantidade_pendente = quantidade_pendente - ?,
                    status = CASE 
                      WHEN quantidade_pendente - ? <= 0 THEN 'RECEBIDO'
                      ELSE 'PARCIAL'
                    END
                WHERE id = ?
              `, [item.quantidade, item.quantidade, item.quantidade, item.pedido_compra_item_id]);
            }
          }

          // Atualizar status do pedido
          const [itensPendentes] = await connection.query(`
            SELECT COUNT(*) as pendentes 
            FROM pedidos_compra_itens 
            WHERE pedido_compra_id = ? AND quantidade_pendente > 0
          `, [vinculo[0].pedido_compra_id]);

          const novoStatus = itensPendentes[0].pendentes === 0 ? 'RECEBIDO' : 'PARCIALMENTE_RECEBIDO';
          
          await connection.query(
            'UPDATE pedidos_compra SET status = ?, data_entrega_real = NOW() WHERE id = ?',
            [novoStatus, vinculo[0].pedido_compra_id]
          );
        }

        // Buscar dados completos da entrada para criar lançamento financeiro
        const [entradaCompleta] = await connection.query(
          `SELECT em.*, f.razao_social as fornecedor_nome
           FROM entradas_mercadorias em
           LEFT JOIN fornecedores f ON em.fornecedor_id = f.id
           WHERE em.id = ?`,
          [id]
        );

        const entrada = entradaCompleta[0];

        // Criar lançamento financeiro usando a configuração de operações
        await criarLancamentoAutomatico({
          operacao: 'COMPRA_MERCADORIA',
          descricao: `Entrada de Mercadorias ${entrada.numero_entrada} - ${entrada.fornecedor_nome}`,
          valor: entrada.valor_total,
          data_lancamento: entrada.data_entrada,
          tipo: 'DESPESA',
          pessoa_id: entrada.fornecedor_id,
          pessoa_tipo: 'FORNECEDOR',
          usuario_id: req.userId,
          observacoes: `Gerado automaticamente pela entrada ${entrada.numero_entrada}`
        });

        await connection.commit();

        res.json({
          success: true,
          message: 'Entrada finalizada e estoque atualizado com sucesso'
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Erro ao finalizar entrada:', error);
      res.status(500).json({ error: error.message || 'Erro ao finalizar entrada' });
    }
  }

  // PRÉ-ENTRADA: Conferir pedido x nota fiscal
  async preEntrada(req, res) {
    try {
      const { pedido_id, nfe_id } = req.body;

      if (!pedido_id || !nfe_id) {
        return res.status(400).json({ 
          error: 'Pedido e NF-e são obrigatórios para pré-entrada' 
        });
      }

      // Buscar itens do pedido
      const [itensPedido] = await db.query(`
        SELECT 
          pci.*,
          p.codigo_principal,
          p.gtin,
          p.descricao as produto_descricao
        FROM pedidos_compra_itens pci
        JOIN produtos p ON pci.produto_id = p.id
        WHERE pci.pedido_compra_id = ?
        ORDER BY pci.numero_item
      `, [pedido_id]);

      // Buscar itens da NF-e
      const [itensNfe] = await db.query(`
        SELECT 
          nei.*,
          p.id as produto_id_vinculado,
          p.descricao as produto_descricao_vinculado
        FROM nfe_entrada_itens nei
        LEFT JOIN produtos p ON nei.produto_id = p.id
        WHERE nei.nfe_entrada_id = ?
        ORDER BY nei.numero_item
      `, [nfe_id]);

      // Comparar e detectar divergências
      const divergencias = [];
      const comparacao = [];

      for (const itemPedido of itensPedido) {
        // Tentar encontrar item correspondente na NF-e
        const itemNfe = itensNfe.find(n => 
          n.produto_id === itemPedido.produto_id ||
          n.codigo_produto === itemPedido.codigo_produto ||
          n.gtin === itemPedido.codigo_produto
        );

        const comparacaoItem = {
          produto_id: itemPedido.produto_id,
          codigo: itemPedido.codigo_produto,
          descricao: itemPedido.descricao,
          pedido: {
            quantidade: itemPedido.quantidade_solicitada,
            valor_unitario: itemPedido.valor_unitario,
            valor_total: itemPedido.valor_total
          },
          nfe: itemNfe ? {
            quantidade: itemNfe.quantidade,
            valor_unitario: itemNfe.valor_unitario,
            valor_total: itemNfe.valor_total
          } : null,
          divergencias: []
        };

        if (!itemNfe) {
          comparacaoItem.divergencias.push({
            tipo: 'PRODUTO_NAO_ENCONTRADO',
            descricao: 'Produto do pedido não encontrado na NF-e'
          });
          divergencias.push(comparacaoItem);
        } else {
          // Verificar quantidade
          if (parseFloat(itemPedido.quantidade_solicitada) !== parseFloat(itemNfe.quantidade)) {
            comparacaoItem.divergencias.push({
              tipo: 'DIVERGENCIA_QUANTIDADE',
              descricao: `Quantidade divergente: Pedido=${itemPedido.quantidade_solicitada}, NF-e=${itemNfe.quantidade}`
            });
          }

          // Verificar valor unitário (tolerância de 1%)
          const diff = Math.abs(parseFloat(itemPedido.valor_unitario) - parseFloat(itemNfe.valor_unitario));
          const tolerancia = parseFloat(itemPedido.valor_unitario) * 0.01;
          
          if (diff > tolerancia) {
            comparacaoItem.divergencias.push({
              tipo: 'DIVERGENCIA_VALOR',
              descricao: `Valor unitário divergente: Pedido=R$ ${itemPedido.valor_unitario}, NF-e=R$ ${itemNfe.valor_unitario}`
            });
          }

          if (comparacaoItem.divergencias.length > 0) {
            divergencias.push(comparacaoItem);
          }
        }

        comparacao.push(comparacaoItem);
      }

      // Verificar se há produtos na NF-e que não estão no pedido
      for (const itemNfe of itensNfe) {
        const encontrado = itensPedido.find(p => 
          p.produto_id === itemNfe.produto_id ||
          p.codigo_produto === itemNfe.codigo_produto ||
          p.codigo_produto === itemNfe.gtin
        );

        if (!encontrado) {
          divergencias.push({
            produto_id: itemNfe.produto_id,
            codigo: itemNfe.codigo_produto,
            descricao: itemNfe.descricao,
            pedido: null,
            nfe: {
              quantidade: itemNfe.quantidade,
              valor_unitario: itemNfe.valor_unitario,
              valor_total: itemNfe.valor_total
            },
            divergencias: [{
              tipo: 'PRODUTO_EXTRA',
              descricao: 'Produto na NF-e não consta no pedido'
            }]
          });
        }
      }

      // Totais
      const totalPedido = itensPedido.reduce((sum, item) => sum + parseFloat(item.valor_total), 0);
      const totalNfe = itensNfe.reduce((sum, item) => sum + parseFloat(item.valor_total), 0);

      res.json({
        pedido_id,
        nfe_id,
        total_itens_pedido: itensPedido.length,
        total_itens_nfe: itensNfe.length,
        total_divergencias: divergencias.length,
        divergencias,
        comparacao_completa: comparacao,
        resumo_valores: {
          pedido: totalPedido.toFixed(2),
          nfe: totalNfe.toFixed(2),
          diferenca: (totalNfe - totalPedido).toFixed(2)
        },
        status: divergencias.length === 0 ? 'OK' : 'COM_DIVERGENCIAS'
      });

    } catch (error) {
      console.error('Erro na pré-entrada:', error);
      res.status(500).json({ error: 'Erro ao realizar pré-entrada' });
    }
  }

  // Cancelar entrada
  async cancelar(req, res) {
    try {
      const { id } = req.params;

      const [entradas] = await db.query(
        'SELECT status FROM entradas_mercadorias WHERE id = ?',
        [id]
      );

      if (entradas.length === 0) {
        return res.status(404).json({ error: 'Entrada não encontrada' });
      }

      if (entradas[0].status === 'FINALIZADO') {
        return res.status(400).json({ 
          error: 'Não é possível cancelar entrada já finalizada' 
        });
      }

      await db.query(
        'UPDATE entradas_mercadorias SET status = \'CANCELADO\' WHERE id = ?',
        [id]
      );

      res.json({ success: true, message: 'Entrada cancelada com sucesso' });

    } catch (error) {
      console.error('Erro ao cancelar entrada:', error);
      res.status(500).json({ error: 'Erro ao cancelar entrada' });
    }
  }

  // Deletar entrada
  async deletar(req, res) {
    try {
      const { id } = req.params;

      const [entradas] = await db.query(
        'SELECT status FROM entradas_mercadorias WHERE id = ?',
        [id]
      );

      if (entradas.length === 0) {
        return res.status(404).json({ error: 'Entrada não encontrada' });
      }

      if (entradas[0].status === 'FINALIZADO') {
        return res.status(400).json({ 
          error: 'Não é possível deletar entrada já finalizada' 
        });
      }

      await db.query('DELETE FROM entradas_mercadorias WHERE id = ?', [id]);

      res.json({ success: true, message: 'Entrada removida com sucesso' });

    } catch (error) {
      console.error('Erro ao deletar entrada:', error);
      res.status(500).json({ error: 'Erro ao deletar entrada' });
    }
  }
}

module.exports = new EntradasMercadoriasController();
