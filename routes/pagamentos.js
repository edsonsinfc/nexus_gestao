// routes/pagamentos.js
const express = require('express');
const router = express.Router();
const PagamentosController = require('../controllers/PagamentosController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

// Webhook PIX (não usa JWT; valida por token próprio)
router.post('/pix/webhook', PagamentosController.webhookPIX);

// Demais rotas exigem autenticação
router.use(authenticateToken);

// Criar cobrança PIX
router.post('/pix/cobranca', requirePermission('pdv'), PagamentosController.criarCobrancaPIX);

// Consultar status
router.get('/pix/:id/status', requirePermission('pdv'), PagamentosController.statusPIX);

// Cancelar cobrança
router.post('/pix/:id/cancelar', requirePermission('pdv'), PagamentosController.cancelarPIX);

// Simular pagamento (somente para testes/demonstração)
router.post('/pix/:id/simular-pago', requirePermission('pdv'), PagamentosController.simularPago);

// Console de logs PIX (somente configurações/admin)
router.get('/pix/logs', requirePermission('configuracoes'), PagamentosController.getPixLogs);
router.delete('/pix/logs', requirePermission('configuracoes'), PagamentosController.clearPixLogs);

module.exports = router;
