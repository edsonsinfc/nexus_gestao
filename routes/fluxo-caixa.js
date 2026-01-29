const express = require('express');
const router = express.Router();
const FluxoCaixaController = require('../controllers/FluxoCaixaController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

router.use(authenticateToken);

// Gerar fluxo de caixa
router.get('/', FluxoCaixaController.gerarFluxoCaixa);

// Lançamentos
router.post('/lancamentos', requirePermission('financeiro'), FluxoCaixaController.criarLancamento);
router.put('/lancamentos/:id', requirePermission('financeiro'), FluxoCaixaController.atualizarLancamento);
router.delete('/lancamentos/:id', requirePermission('financeiro'), FluxoCaixaController.deletarLancamento);

module.exports = router;
