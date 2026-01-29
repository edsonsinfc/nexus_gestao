// src/routes/estoqueRoutes.js
const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoqueController');
const entradaMercadoriasController = require('../controllers/entradaMercadoriasController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de movimentações de estoque
router.get('/movimentacoes', estoqueController.listarMovimentacoes);
router.post('/movimentacoes', requirePermission('estoque'), estoqueController.criarMovimentacao);

// Rotas de relatórios de estoque
router.get('/relatorio', estoqueController.relatorioEstoque);
router.get('/estoque-baixo', estoqueController.listarEstoqueBaixo);

// Rotas de entrada de mercadorias
router.get('/entradas', entradaMercadoriasController.listar);
router.get('/entradas/:id', entradaMercadoriasController.buscarPorId);
router.post('/entradas', requirePermission('estoque'), entradaMercadoriasController.criar);
router.put('/entradas/:id/status', requirePermission('estoque'), entradaMercadoriasController.atualizarStatus);
router.delete('/entradas/:id', requirePermission('estoque'), entradaMercadoriasController.excluir);

module.exports = router;

