const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db.mysql');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('gestor'));

// Listar usuários (com filtros opcionais)
router.get('/', async (req, res) => {
  try {
    const { perfil, ativo, q } = req.query || {};
    let page = parseInt(req.query.page || '1', 10);
    let pageSize = parseInt(req.query.pageSize || '20', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    const where = [];
    const vals = [];
    if (perfil) { where.push('u.perfil = ?'); vals.push(perfil); }
    if (ativo !== undefined) { where.push('u.ativo = ?'); vals.push(ativo === '1' || ativo === 'true' ? 1 : 0); }
    if (q) { where.push('(u.nome LIKE ? OR u.email LIKE ?)'); vals.push(`%${q}%`, `%${q}%`); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total
         FROM usuarios u
         LEFT JOIN equipes e ON e.id = u.equipe_id
         ${whereSql}`,
      vals
    );

    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.equipe_id,
              e.nome AS equipe_nome
         FROM usuarios u
         LEFT JOIN equipes e ON e.id = u.equipe_id
         ${whereSql}
         ORDER BY u.nome
         LIMIT ${pageSize} OFFSET ${offset}`,
      vals
    );
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ usuarios: rows, page, pageSize, total, totalPages });
  } catch (e) {
    console.error('Erro listar usuarios:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar usuário
router.post('/', async (req, res) => {
  try {
    const { nome, email, senha, perfil, ativo = 1, equipe_id = null } = req.body || {};
    if (!nome || !email || !senha || !perfil) return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, perfil' });
    if (!['gestor','equipe'].includes(perfil)) return res.status(400).json({ error: 'Perfil inválido' });

    const senhaHash = await bcrypt.hash(String(senha), parseInt(process.env.BCRYPT_ROUNDS || '10', 10));
    const [r] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha, perfil, ativo, equipe_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, senhaHash, perfil, (ativo ? 1 : 0), equipe_id || null]
    );
    const [novo] = await pool.execute('SELECT id, nome, email, perfil, ativo, equipe_id FROM usuarios WHERE id = ?', [r.insertId]);
    res.status(201).json(novo[0]);
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'E-mail já cadastrado' });
    console.error('Erro criar usuario:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Atualizar usuário
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, ativo, equipe_id, senha } = req.body || {};

    const sets = [];
    const vals = [];
    if (nome !== undefined) { sets.push('nome = ?'); vals.push(nome); }
    if (email !== undefined) { sets.push('email = ?'); vals.push(email); }
    if (perfil !== undefined) {
      if (!['gestor','equipe'].includes(perfil)) return res.status(400).json({ error: 'Perfil inválido' });
      sets.push('perfil = ?'); vals.push(perfil);
    }
    if (ativo !== undefined) { sets.push('ativo = ?'); vals.push(ativo ? 1 : 0); }
    if (equipe_id !== undefined) { sets.push('equipe_id = ?'); vals.push(equipe_id || null); }

    if (senha !== undefined && senha !== null && senha !== '') {
      const senhaHash = await bcrypt.hash(String(senha), parseInt(process.env.BCRYPT_ROUNDS || '10', 10));
      sets.push('senha = ?'); vals.push(senhaHash);
    }

    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(id);

    const [r] = await pool.execute(`UPDATE usuarios SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, vals);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const [novo] = await pool.execute('SELECT id, nome, email, perfil, ativo, equipe_id FROM usuarios WHERE id = ?', [id]);
    res.json(novo[0]);
  } catch (e) {
    console.error('Erro atualizar usuario:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { router };
