// src/routes/fornecedoresRoutes.js
const express = require('express');
const router = express.Router();
const fornecedoresController = require('../controllers/fornecedoresController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de fornecedores
router.get('/', fornecedoresController.listar);
router.get('/:id', fornecedoresController.buscarPorId);
router.get('/codigo/:codigo', fornecedoresController.buscarPorCodigo);
router.post('/', requirePermission('cadastros'), fornecedoresController.criar);
router.put('/:id', requirePermission('cadastros'), fornecedoresController.atualizar);
router.delete('/:id', requirePermission('cadastros'), fornecedoresController.excluir);

module.exports = router;

