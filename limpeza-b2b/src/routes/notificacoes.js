const express = require('express');
const pool = require('../config/db.mysql');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole('gestor'), async (req, res) => {
  const { status, equipe_id } = req.query || {};
  const where = [];
  const vals = [];
  if (status) { where.push('status = ?'); vals.push(status); }
  if (equipe_id) { where.push('equipe_id = ?'); vals.push(equipe_id); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const [rows] = await pool.execute(`SELECT * FROM notificacoes ${whereSql} ORDER BY data DESC`, vals);
  res.json({ notificacoes: rows });
});

router.patch('/:id/lida', requireRole('gestor'), async (req, res) => {
  const { id } = req.params;
  await pool.execute('UPDATE notificacoes SET status = ? WHERE id = ?', ['lida', id]);
  res.json({ ok: true });
});

module.exports = { router };
