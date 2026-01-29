// src/routes/caixaRoutes.js
const express = require('express');
const router = express.Router();
const caixaController = require('../controllers/caixaController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de caixa
router.get('/', caixaController.listar);
router.get('/:id', caixaController.buscarPorId);
router.post('/abrir', requirePermission('vendas'), caixaController.abrir);
router.put('/:id/fechar', requirePermission('vendas'), caixaController.fechar);
router.get('/:id/movimentacoes', caixaController.movimentacoes);
router.get('/:id/relatorio', caixaController.relatorio);

module.exports = router;

