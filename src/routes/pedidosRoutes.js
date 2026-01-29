// src/routes/pedidosRoutes.js
const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de pedidos
router.get('/', pedidosController.listar);
router.get('/:id', pedidosController.buscarPorId);
router.post('/', requirePermission('vendas'), pedidosController.criar);
router.put('/:id/status', requirePermission('vendas'), pedidosController.atualizarStatus);
router.delete('/:id', requirePermission('vendas'), pedidosController.excluir);

module.exports = router;

