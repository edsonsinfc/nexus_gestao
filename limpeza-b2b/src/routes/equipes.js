const express = require('express');
const pool = require('../config/db.mysql');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole('gestor'), async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM equipes ORDER BY nome');
  res.json({ equipes: rows });
});

router.post('/', requireRole('gestor'), async (req, res) => {
  try {
    const { nome, gestor_id, limite_total } = req.body || {};
    if (!nome || !gestor_id || limite_total == null) return res.status(400).json({ error: 'Campos obrigatórios: nome, gestor_id, limite_total' });
    const [r] = await pool.execute(
      'INSERT INTO equipes (nome, gestor_id, limite_total, saldo_atual, status) VALUES (?, ?, ?, ?, ?)',
      [nome, gestor_id, limite_total, limite_total, 'ATIVA']
    );
    const [row] = await pool.execute('SELECT * FROM equipes WHERE id = ?', [r.insertId]);
    res.status(201).json(row[0]);
  } catch (e) {
    console.error('Erro criar equipe:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.patch('/:id', requireRole('gestor'), async (req, res) => {
  const { id } = req.params;
  const { nome, limite_total, status } = req.body || {};
  const sets = [];
  const vals = [];
  if (nome !== undefined) { sets.push('nome = ?'); vals.push(nome); }
  if (limite_total !== undefined) { sets.push('limite_total = ?'); vals.push(limite_total); }
  if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
  if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
  vals.push(id);
  await pool.execute(`UPDATE equipes SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, vals);
  const [row] = await pool.execute('SELECT * FROM equipes WHERE id = ?', [id]);
  res.json(row[0]);
});

router.get('/:id/saldo', async (req, res) => {
  const { id } = req.params;
  const [[row]] = await pool.execute('SELECT id, nome, limite_total, saldo_atual FROM equipes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Equipe não encontrada' });
  res.json(row);
});

module.exports = { router };
