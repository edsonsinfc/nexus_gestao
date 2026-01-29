// src/routes/produtosRoutes.js
const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de produtos
router.get('/', produtosController.listar);
router.get('/:id', produtosController.buscarPorId);
router.get('/codigo/:codigo', produtosController.buscarPorCodigo);

// Rotas que requerem permissão de cadastros
router.post('/', requirePermission('cadastros'), produtosController.criar);
router.put('/:id', requirePermission('cadastros'), produtosController.atualizar);
router.delete('/:id', requirePermission('cadastros'), produtosController.excluir);

// Atualização de estoque requer permissão de estoque
router.post('/:id/estoque', requirePermission('estoque'), produtosController.atualizarEstoque);

module.exports = router;
