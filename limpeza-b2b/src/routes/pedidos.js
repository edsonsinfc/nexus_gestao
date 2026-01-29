const express = require('express');
const pool = require('../config/db.mysql');
const { authenticate, requireRole } = require('../middleware/auth');
const { registrarNotificacaoIfNeeded, checarAlertaSaldo } = require('../services/alertaService');
const { syncPedidoOracle } = require('../services/oracleSyncService');
const emailService = require('../services/emailService');

const router = express.Router();

router.use(authenticate);

// Criar pedido (equipe)
router.post('/', requireRole('equipe', 'gestor'), async (req, res) => {
  console.log('🔵 POST /api/pedidos - Iniciando criação de pedido');
  console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));
  console.log('👤 Usuário:', req.user);
  
  const conn = await pool.getConnection();
  console.log('✅ Conexão obtida do pool');
  
  try {
    const { equipe_id, itens = [] } = req.body || {};
    if (!equipe_id || !Array.isArray(itens) || itens.length === 0) {
      console.log('❌ Validação falhou: equipe_id ou itens inválidos');
      return res.status(400).json({ error: 'Informe equipe_id e itens' });
    }

    // Segurança: se usuário for 'equipe', só pode criar para a própria equipe
    if (req.user && req.user.perfil === 'equipe' && req.user.equipe_id && Number(req.user.equipe_id) !== Number(equipe_id)) {
      console.log('❌ Equipe não autorizada:', req.user.equipe_id, '!==', equipe_id);
      return res.status(403).json({ error: 'Equipe não autorizada para este pedido' });
    }

    console.log('🔄 Iniciando transação...');
    await conn.beginTransaction();

    const [[eq]] = await conn.execute('SELECT id, limite_total, saldo_atual FROM equipes WHERE id = ? FOR UPDATE', [equipe_id]);
    console.log('📊 Equipe encontrada:', eq);
    
    if (!eq) { 
      console.log('❌ Equipe não encontrada:', equipe_id);
      await conn.rollback(); 
      return res.status(404).json({ error: 'Equipe não encontrada' }); 
    }

    const valor_total = itens.reduce((acc, it) => acc + (Number(it.quantidade||0) * Number(it.valor_unitario||0)), 0);
    console.log('💰 Valor total do pedido:', valor_total);
    console.log('💵 Saldo atual da equipe:', eq.saldo_atual);

    if (eq.saldo_atual < valor_total) {
      await registrarNotificacaoIfNeeded(conn, equipe_id, 'SALDO_INSUFICIENTE', 'Saldo insuficiente. O gestor foi notificado para revisar o limite.');
      await conn.commit();
      return res.status(400).json({ error: 'Saldo insuficiente. O gestor foi notificado para revisar o limite.' });
    }

    const [r] = await conn.execute(
      'INSERT INTO pedidos (equipe_id, valor_total, data, status, saldo_restante, origem) VALUES (?, ?, NOW(), ?, ?, ?)',
      [equipe_id, valor_total, 'AGUARDANDO', (eq.saldo_atual - valor_total), 'Local']
    );
    const pedidoId = r.insertId;

    for (const it of itens) {
      await conn.execute(
        'INSERT INTO itens_pedido (pedido_id, codprod, descricao, quantidade, valor_unitario, valor_total) VALUES (?, ?, ?, ?, ?, ?)',
        [pedidoId, it.codprod, it.descricao, it.quantidade, it.valor_unitario, (Number(it.quantidade)*Number(it.valor_unitario))]
      );
    }

    await conn.execute('UPDATE equipes SET saldo_atual = saldo_atual - ? WHERE id = ?', [valor_total, equipe_id]);

    await checarAlertaSaldo(conn, equipe_id); // alerta < 10%

    console.log('✅ Commit da transação...');
    await conn.commit();
    console.log('✅ Transação commitada com sucesso!');

    // Enviar notificação por email após commit bem-sucedido
    try {
      console.log('📧 Tentando enviar email de notificação...');
      const [[equipeInfo]] = await conn.execute(
        'SELECT nome, vendedor_email FROM equipes WHERE id = ?', 
        [equipe_id]
      );
      
      console.log('📋 Info da equipe:', equipeInfo);
      
      if (equipeInfo && equipeInfo.vendedor_email) {
        const pedidoCompleto = {
          id: pedidoId,
          valor_total,
          data: new Date(),
          status: 'AGUARDANDO'
        };
        
        console.log('📨 Enviando email para:', equipeInfo.vendedor_email);
        await emailService.enviarNotificacaoPedido({
          pedido: pedidoCompleto,
          equipe: equipeInfo,
          itens: itens,
          vendedorEmail: equipeInfo.vendedor_email
        });
        console.log('✅ Email enviado com sucesso!');
      } else {
        console.log('⚠️  Email não enviado: vendedor_email não configurado');
      }
    } catch (emailError) {
      console.error('❌ Erro ao enviar email de notificação:', emailError);
      // Não falha a operação se email der erro
    }

    console.log('🎉 Retornando sucesso para o cliente:', { id: pedidoId, status: 'AGUARDANDO' });
    res.status(201).json({ id: pedidoId, status: 'AGUARDANDO' });
  } catch (e) {
    console.error('❌ ERRO FATAL ao criar pedido:', e);
    console.error('❌ Stack:', e.stack);
    await conn.rollback();
    console.error('Erro criar pedido:', e);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    console.log('🔄 Liberando conexão...');
    conn.release();
    console.log('✅ Conexão liberada');
  }
});

// Listar pedidos
router.get('/', requireRole('gestor', 'equipe'), async (req, res) => {
  let { status, equipe_id } = req.query;
  let page = parseInt(req.query.page || '1', 10);
  let pageSize = parseInt(req.query.pageSize || '20', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
  if (pageSize > 100) pageSize = 100;

  const where = [];
  const vals = [];
  if (status) { where.push('p.status = ?'); vals.push(status); }
  if (equipe_id) { where.push('p.equipe_id = ?'); vals.push(equipe_id); }

  // segurança: usuário equipe só pode listar os próprios pedidos
  if (req.user && req.user.perfil === 'equipe' && req.user.equipe_id) {
    where.push('p.equipe_id = ?');
    vals.push(req.user.equipe_id);
  }

  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM pedidos p JOIN equipes e ON e.id = p.equipe_id ${whereSql}`,
    vals
  );
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.execute(
    `SELECT p.*, e.nome AS equipe_nome FROM pedidos p JOIN equipes e ON e.id = p.equipe_id ${whereSql} ORDER BY p.data DESC LIMIT ${pageSize} OFFSET ${offset}`,
    vals
  );
  res.json({ pedidos: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

// Cancelar pedido (AGUARDANDO)
router.post('/:id/cancelar', requireRole('gestor', 'equipe'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    await conn.beginTransaction();
    const [[ped]] = await conn.execute('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (!ped) { await conn.rollback(); return res.status(404).json({ error: 'Pedido não encontrado' }); }
    if (ped.status !== 'AGUARDANDO') { await conn.rollback(); return res.status(400).json({ error: 'Somente pedidos AGUARDANDO podem ser cancelados' }); }
    // equipe só pode cancelar pedido da própria equipe
    if (req.user && req.user.perfil === 'equipe' && req.user.equipe_id && Number(req.user.equipe_id) !== Number(ped.equipe_id)) {
      await conn.rollback();
      return res.status(403).json({ error: 'Sem permissão para cancelar este pedido' });
    }

    // estorna saldo
    await conn.execute('UPDATE equipes SET saldo_atual = saldo_atual + ? WHERE id = ?', [ped.valor_total, ped.equipe_id]);
    // marca cancelado
    await conn.execute('UPDATE pedidos SET status = ? WHERE id = ?', ['CANCELADO', id]);

    await conn.commit();
    res.json({ message: 'Pedido cancelado', id });
  } catch (e) {
    await conn.rollback();
    console.error('Erro cancelar pedido:', e);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    conn.release();
  }
});

// Aprovar e enviar para Oracle
router.post('/:id/aprovar', requireRole('gestor'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    await conn.beginTransaction();
    const [[ped]] = await conn.execute('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (!ped) { await conn.rollback(); return res.status(404).json({ error: 'Pedido não encontrado' }); }
    if (ped.status !== 'AGUARDANDO') { await conn.rollback(); return res.status(400).json({ error: 'Pedido não está aguardando' }); }

    const [itens] = await conn.execute('SELECT * FROM itens_pedido WHERE pedido_id = ?', [id]);

    // Enviar para Oracle
    const sync = await syncPedidoOracle(ped, itens);

    await conn.execute('UPDATE pedidos SET status = ?, origem = ? WHERE id = ?', ['ENVIADO', 'ERP', id]);

    await conn.commit();
    res.json({ message: 'Pedido aprovado e enviado', protocolo: sync?.protocolo || null });
  } catch (e) {
    await conn.rollback();
    console.error('Erro aprovar pedido:', e);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    conn.release();
  }
});

module.exports = { router };
