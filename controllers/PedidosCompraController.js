// controllers/PedidosCompraController.js
const db = require('../db');

class PedidosCompraController {

  // Listar pedidos
  async listar(req, res) {
    try {
      const { 
        status, 
        fornecedor_id,
        data_inicio,
        data_fim,
        page = 1,
        limit = 20 
      } = req.query;

      let sql = `
        SELECT 
          pc.*,
          f.razao_social as fornecedor_razao_social,
          f.nome_fantasia as fornecedor_nome_fantasia,
          u.nome as usuario_nome,
          aprovador.nome as aprovador_nome,
          (SELECT COUNT(*) FROM pedidos_compra_itens WHERE pedido_compra_id = pc.id) as total_itens,
          (SELECT SUM(quantidade_pendente) FROM pedidos_compra_itens WHERE pedido_compra_id = pc.id) as itens_pendentes
        FROM pedidos_compra pc
        LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
        LEFT JOIN usuarios u ON pc.usuario_id = u.id
        LEFT JOIN usuarios aprovador ON pc.aprovado_por_id = aprovador.id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        sql += ' AND pc.status = ?';
        params.push(status);
      }

      if (fornecedor_id) {
        sql += ' AND pc.fornecedor_id = ?';
        params.push(fornecedor_id);
      }

      if (data_inicio) {
        sql += ' AND pc.data_pedido >= ?';
        params.push(data_inicio);
      }

      if (data_fim) {
        sql += ' AND pc.data_pedido <= ?';
        params.push(data_fim);
      }

      sql += ' ORDER BY pc.created_at DESC';

      const offset = (page - 1) * limit;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [pedidos] = await db.query(sql, params);

      // Contar total
      let sqlCount = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      sqlCount = sqlCount.replace(/LIMIT.*/, '');
      const [countResult] = await db.query(sqlCount, params.slice(0, -2));

      res.json({
        pedidos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      res.status(500).json({ error: 'Erro ao listar pedidos de compra' });
    }
  }

  // Buscar pedido por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const [pedidos] = await db.query(`
        SELECT 
          pc.*,
          f.*,
          f.id as fornecedor_id,
          u.nome as usuario_nome,
          aprovador.nome as aprovador_nome
        FROM pedidos_compra pc
        LEFT JOIN fornecedores f ON pc.fornecedor_id = f.id
        LEFT JOIN usuarios u ON pc.usuario_id = u.id
        LEFT JOIN usuarios aprovador ON pc.aprovado_por_id = aprovador.id
        WHERE pc.id = ?
      `, [id]);

      if (pedidos.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      // Buscar itens
      const [itens] = await db.query(`
        SELECT 
          pci.*,
          p.codigo_principal,
          p.gtin,
          p.estoque_atual,
          p.preco_custo
        FROM pedidos_compra_itens pci
        LEFT JOIN produtos p ON pci.produto_id = p.id
        WHERE pci.pedido_compra_id = ?
        ORDER BY pci.numero_item
      `, [id]);

      res.json({
        pedido: pedidos[0],
        itens
      });

    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
  }

  // Criar novo pedido
  async criar(req, res) {
    try {
      const {
        fornecedor_id,
        data_pedido,
        data_entrega_prevista,
        prazo_entrega_dias,
        forma_pagamento,
        condicao_pagamento,
        prazo_pagamento_dias,
        local_entrega,
        observacoes,
        itens
      } = req.body;

      if (!fornecedor_id) {
        return res.status(400).json({ error: 'Fornecedor é obrigatório' });
      }

      if (!itens || itens.length === 0) {
        return res.status(400).json({ error: 'Pedido deve ter pelo menos um item' });
      }

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Gerar número do pedido
        const [lastPedido] = await connection.query(
          'SELECT numero_pedido FROM pedidos_compra ORDER BY id DESC LIMIT 1'
        );
        
        let numeroPedido = 1;
        if (lastPedido.length > 0) {
          const lastNum = parseInt(lastPedido[0].numero_pedido.replace(/\D/g, ''));
          numeroPedido = lastNum + 1;
        }
        numeroPedido = `PC${numeroPedido.toString().padStart(6, '0')}`;

        // Calcular totais
        let valorProdutos = 0;
        for (const item of itens) {
          valorProdutos += item.quantidade_solicitada * item.valor_unitario - (item.valor_desconto || 0);
        }

        const valorTotal = valorProdutos;

        // Criar pedido
        const [resultPedido] = await connection.query(`
          INSERT INTO pedidos_compra (
            numero_pedido, fornecedor_id,
            data_pedido, data_entrega_prevista, prazo_entrega_dias,
            valor_produtos, valor_total,
            forma_pagamento, condicao_pagamento, prazo_pagamento_dias,
            local_entrega, observacoes,
            usuario_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RASCUNHO')
        `, [
          numeroPedido,
          fornecedor_id,
          data_pedido || new Date(),
          data_entrega_prevista || null,
          prazo_entrega_dias || null,
          valorProdutos,
          valorTotal,
          forma_pagamento || null,
          condicao_pagamento || null,
          prazo_pagamento_dias || null,
          local_entrega || null,
          observacoes || null,
          req.userId
        ]);

        const pedidoId = resultPedido.insertId;

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
          const valorTotal = item.quantidade_solicitada * item.valor_unitario - (item.valor_desconto || 0);

          await connection.query(`
            INSERT INTO pedidos_compra_itens (
              pedido_compra_id, numero_item,
              produto_id, codigo_produto, descricao, unidade,
              quantidade_solicitada, quantidade_pendente,
              valor_unitario, valor_desconto, valor_total,
              observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            pedidoId,
            i + 1,
            item.produto_id,
            produto.codigo_principal,
            produto.descricao,
            produto.unidade,
            item.quantidade_solicitada,
            item.quantidade_solicitada,
            item.valor_unitario,
            item.valor_desconto || 0,
            valorTotal,
            item.observacoes || null
          ]);
        }

        await connection.commit();

        res.json({
          success: true,
          message: 'Pedido criado com sucesso',
          pedido_id: pedidoId,
          numero_pedido: numeroPedido
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: error.message || 'Erro ao criar pedido' });
    }
  }

  // Atualizar pedido
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        data_entrega_prevista,
        prazo_entrega_dias,
        forma_pagamento,
        condicao_pagamento,
        prazo_pagamento_dias,
        local_entrega,
        observacoes,
        itens
      } = req.body;

      // Verificar se pedido existe e pode ser alterado
      const [pedidos] = await db.query(
        'SELECT status FROM pedidos_compra WHERE id = ?',
        [id]
      );

      if (pedidos.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      if (['RECEBIDO', 'CANCELADO'].includes(pedidos[0].status)) {
        return res.status(400).json({ 
          error: 'Não é possível alterar pedido recebido ou cancelado' 
        });
      }

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Atualizar cabeçalho
        await connection.query(`
          UPDATE pedidos_compra SET
            data_entrega_prevista = ?,
            prazo_entrega_dias = ?,
            forma_pagamento = ?,
            condicao_pagamento = ?,
            prazo_pagamento_dias = ?,
            local_entrega = ?,
            observacoes = ?
          WHERE id = ?
        `, [
          data_entrega_prevista || null,
          prazo_entrega_dias || null,
          forma_pagamento || null,
          condicao_pagamento || null,
          prazo_pagamento_dias || null,
          local_entrega || null,
          observacoes || null,
          id
        ]);

        // Se itens foram enviados, atualizar
        if (itens && itens.length > 0) {
          // Remover itens antigos
          await connection.query(
            'DELETE FROM pedidos_compra_itens WHERE pedido_compra_id = ?',
            [id]
          );

          // Recalcular totais
          let valorProdutos = 0;
          for (const item of itens) {
            valorProdutos += item.quantidade_solicitada * item.valor_unitario - (item.valor_desconto || 0);
          }

          // Atualizar valores
          await connection.query(
            'UPDATE pedidos_compra SET valor_produtos = ?, valor_total = ? WHERE id = ?',
            [valorProdutos, valorProdutos, id]
          );

          // Inserir novos itens
          for (let i = 0; i < itens.length; i++) {
            const item = itens[i];
            const [produtos] = await connection.query(
              'SELECT codigo_principal, descricao, unidade FROM produtos WHERE id = ?',
              [item.produto_id]
            );

            const produto = produtos[0];
            const valorTotal = item.quantidade_solicitada * item.valor_unitario - (item.valor_desconto || 0);

            await connection.query(`
              INSERT INTO pedidos_compra_itens (
                pedido_compra_id, numero_item,
                produto_id, codigo_produto, descricao, unidade,
                quantidade_solicitada, quantidade_recebida, quantidade_pendente,
                valor_unitario, valor_desconto, valor_total,
                status, observacoes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)
            `, [
              id, i + 1,
              item.produto_id, produto.codigo_principal, produto.descricao, produto.unidade,
              item.quantidade_solicitada,
              item.quantidade_recebida || 0,
              item.quantidade_solicitada - (item.quantidade_recebida || 0),
              item.valor_unitario, item.valor_desconto || 0, valorTotal,
              item.observacoes || null
            ]);
          }
        }

        await connection.commit();

        res.json({ success: true, message: 'Pedido atualizado com sucesso' });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      res.status(500).json({ error: error.message || 'Erro ao atualizar pedido' });
    }
  }

  // Aprovar pedido
  async aprovar(req, res) {
    try {
      const { id } = req.params;

      const [pedidos] = await db.query(
        'SELECT status FROM pedidos_compra WHERE id = ?',
        [id]
      );

      if (pedidos.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      if (pedidos[0].status !== 'AGUARDANDO_APROVACAO' && pedidos[0].status !== 'RASCUNHO') {
        return res.status(400).json({ error: 'Pedido não pode ser aprovado neste status' });
      }

      await db.query(`
        UPDATE pedidos_compra 
        SET status = 'APROVADO',
            aprovado_por_id = ?,
            data_aprovacao = NOW()
        WHERE id = ?
      `, [req.userId, id]);

      res.json({ success: true, message: 'Pedido aprovado com sucesso' });

    } catch (error) {
      console.error('Erro ao aprovar pedido:', error);
      res.status(500).json({ error: 'Erro ao aprovar pedido' });
    }
  }

  // Enviar pedido para fornecedor
  async enviar(req, res) {
    try {
      const { id } = req.params;

      const [pedidos] = await db.query(
        'SELECT status FROM pedidos_compra WHERE id = ?',
        [id]
      );

      if (pedidos.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      if (pedidos[0].status !== 'APROVADO') {
        return res.status(400).json({ error: 'Pedido precisa estar aprovado para ser enviado' });
      }

      await db.query(
        'UPDATE pedidos_compra SET status = \'ENVIADO\' WHERE id = ?',
        [id]
      );

      // TODO: Implementar envio de e-mail para fornecedor

      res.json({ 
        success: true, 
        message: 'Pedido marcado como enviado' 
      });

    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      res.status(500).json({ error: 'Erro ao enviar pedido' });
    }
  }

  // Cancelar pedido
  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const [pedidos] = await db.query(
        'SELECT status FROM pedidos_compra WHERE id = ?',
        [id]
      );

      if (pedidos.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      if (pedidos[0].status === 'RECEBIDO') {
        return res.status(400).json({ error: 'Não é possível cancelar pedido já recebido' });
      }

      await db.query(`
        UPDATE pedidos_compra 
        SET status = 'CANCELADO',
            motivo_reprovacao = ?
        WHERE id = ?
      `, [motivo || 'Cancelado pelo usuário', id]);

      res.json({ success: true, message: 'Pedido cancelado com sucesso' });

    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      res.status(500).json({ error: 'Erro ao cancelar pedido' });
    }
  }

  // Deletar pedido (apenas rascunho)
  async deletar(req, res) {
    try {
      const { id } = req.params;

      const [pedidos] = await db.query(
        'SELECT status FROM pedidos_compra WHERE id = ?',
        [id]
      );

      if (pedidos.length === 0) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      if (pedidos[0].status !== 'RASCUNHO') {
        return res.status(400).json({ 
          error: 'Apenas pedidos em rascunho podem ser deletados' 
        });
      }

      await db.query('DELETE FROM pedidos_compra WHERE id = ?', [id]);

      res.json({ success: true, message: 'Pedido removido com sucesso' });

    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      res.status(500).json({ error: 'Erro ao deletar pedido' });
    }
  }
}

module.exports = new PedidosCompraController();
