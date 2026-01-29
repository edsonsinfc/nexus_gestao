// routes/auditoria.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../src/middleware/auth');
const AuditoriaMiddleware = require('../src/middleware/auditoria');
const pool = require('../db');

// Todas as rotas de auditoria requerem permissão de admin
router.use(authenticateToken, requirePermission('admin'));

/**
 * GET /api/auditoria
 * Lista logs de auditoria com filtros
 */
router.get('/', async (req, res) => {
  try {
    const {
      tabela,
      operacao,
      usuario_id,
      data_inicio,
      data_fim,
      page = 1,
      limit = 50
    } = req.query;

    let query = `
      SELECT 
        a.id,
        a.tabela,
        a.registro_id,
        a.operacao,
        a.usuario_nome,
        u.nome as usuario,
        a.dados_anteriores,
        a.dados_novos,
        a.ip_address,
        a.timestamp
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (tabela) {
      query += ' AND a.tabela = ?';
      params.push(tabela);
    }

    if (operacao) {
      query += ' AND a.operacao = ?';
      params.push(operacao);
    }

    if (usuario_id) {
      query += ' AND a.usuario_id = ?';
      params.push(usuario_id);
    }

    if (data_inicio) {
      query += ' AND a.timestamp >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND a.timestamp <= ?';
      params.push(data_fim);
    }

    // Total de registros
    const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    const [[{ total }]] = await pool.execute(countQuery, params);

    // Paginação
    const offset = (page - 1) * limit;
    query += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [logs] = await pool.execute(query, params);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
  }
});

/**
 * GET /api/auditoria/historico/:tabela/:id
 * Histórico completo de um registro específico
 */
router.get('/historico/:tabela/:id', async (req, res) => {
  try {
    const { tabela, id } = req.params;
    const historico = await AuditoriaMiddleware.getHistorico(tabela, id);
    res.json({ historico });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

/**
 * GET /api/auditoria/usuario/:id
 * Atividades de um usuário específico
 */
router.get('/usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_inicio, data_fim } = req.query;

    const inicio = data_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fim = data_fim || new Date().toISOString().split('T')[0];

    const atividades = await AuditoriaMiddleware.getAtividadesUsuario(id, inicio, fim);
    res.json({ atividades });
  } catch (error) {
    console.error('Erro ao buscar atividades do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar atividades do usuário' });
  }
});

/**
 * GET /api/auditoria/resumo
 * Resumo de atividades (dashboard)
 */
router.get('/resumo', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const inicio = data_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fim = data_fim || new Date().toISOString().split('T')[0];

    // Resumo por tabela
    const [porTabela] = await pool.execute(
      `SELECT 
        tabela,
        operacao,
        COUNT(*) as quantidade
       FROM auditoria
       WHERE timestamp BETWEEN ? AND ?
       GROUP BY tabela, operacao
       ORDER BY quantidade DESC`,
      [inicio, fim]
    );

    // Usuários mais ativos
    const [usuariosAtivos] = await pool.execute(
      `SELECT 
        u.id,
        u.nome,
        COUNT(*) as acoes
       FROM auditoria a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.timestamp BETWEEN ? AND ?
       GROUP BY u.id, u.nome
       ORDER BY acoes DESC
       LIMIT 10`,
      [inicio, fim]
    );

    // Atividades por dia
    const [porDia] = await pool.execute(
      `SELECT 
        DATE(timestamp) as data,
        COUNT(*) as quantidade
       FROM auditoria
       WHERE timestamp BETWEEN ? AND ?
       GROUP BY DATE(timestamp)
       ORDER BY data DESC`,
      [inicio, fim]
    );

    res.json({
      porTabela,
      usuariosAtivos,
      porDia
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de auditoria:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo de auditoria' });
  }
});

/**
 * GET /api/auditoria/security-logs
 * Logs de segurança
 */
router.get('/security-logs', async (req, res) => {
  try {
    const { event_type, severity, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT 
        id,
        event_type,
        usuario_id,
        username,
        ip_address,
        details,
        severity,
        timestamp
      FROM security_logs
      WHERE 1=1
    `;
    
    const params = [];

    if (event_type) {
      query += ' AND event_type = ?';
      params.push(event_type);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    // Total
    const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    const [[{ total }]] = await pool.execute(countQuery, params);

    // Paginação
    const offset = (page - 1) * limit;
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [logs] = await pool.execute(query, params);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de segurança:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de segurança' });
  }
});

/**
 * GET /api/auditoria/suspeitas
 * Detectar atividades suspeitas
 */
router.get('/suspeitas', async (req, res) => {
  try {
    const suspeitas = await AuditoriaMiddleware.detectarAtividadesSuspeitas();
    res.json(suspeitas);
  } catch (error) {
    console.error('Erro ao detectar atividades suspeitas:', error);
    res.status(500).json({ error: 'Erro ao detectar atividades suspeitas' });
  }
});

/**
 * GET /api/auditoria/export
 * Exportar logs para CSV
 */
router.get('/export', async (req, res) => {
  try {
    const { tabela, data_inicio, data_fim } = req.query;

    let query = `
      SELECT 
        a.timestamp,
        a.tabela,
        a.registro_id,
        a.operacao,
        u.nome as usuario,
        a.ip_address
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (tabela) {
      query += ' AND a.tabela = ?';
      params.push(tabela);
    }

    if (data_inicio) {
      query += ' AND a.timestamp >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND a.timestamp <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY a.timestamp DESC';

    const [logs] = await pool.execute(query, params);

    // Gerar CSV
    const csv = [
      'Timestamp,Tabela,Registro ID,Operação,Usuário,IP',
      ...logs.map(log => 
        `${log.timestamp},${log.tabela},${log.registro_id},${log.operacao},${log.usuario || 'Sistema'},${log.ip_address || ''}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=auditoria.csv');
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    res.status(500).json({ error: 'Erro ao exportar logs' });
  }
});

module.exports = router;
