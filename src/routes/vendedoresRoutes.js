// src/routes/vendedoresRoutes.js
const express = require('express');
const router = express.Router();
const vendedoresController = require('../controllers/vendedoresController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de vendedores
router.get('/', vendedoresController.listar);
router.get('/:id', vendedoresController.buscarPorId);

// Rotas que requerem permissão de cadastros
router.post('/', requirePermission('cadastros'), vendedoresController.criar);
router.put('/:id', requirePermission('cadastros'), vendedoresController.atualizar);
router.delete('/:id', requirePermission('cadastros'), vendedoresController.excluir);

module.exports = router;

