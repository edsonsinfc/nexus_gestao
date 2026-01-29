// src/routes/comissoesRoutes.js
const express = require('express');
const router = express.Router();
const comissoesController = require('../controllers/comissoesController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de regras de comissão
router.get('/regras', comissoesController.listarRegras);
router.post('/regras', requirePermission('cadastros'), comissoesController.criarRegra);

// Rotas de comissões
router.get('/', comissoesController.listarComissoes);
router.post('/calcular/:venda_id', requirePermission('vendas'), comissoesController.calcularComissoes);
router.put('/marcar-pago', requirePermission('vendas'), comissoesController.marcarComoPago);

// Relatórios
router.get('/relatorio/vendedor', comissoesController.relatorioVendedor);

module.exports = router;

