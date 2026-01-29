const express = require('express');
const router = express.Router();
const CaixaFechamentoController = require('../controllers/CaixaFechamentoController');
const authMiddleware = require('../middlewares/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de fechamento de caixa
router.post('/iniciar', CaixaFechamentoController.iniciarFechamento);
router.put('/:fechamento_id/concluir', CaixaFechamentoController.concluirFechamento);
router.get('/:fechamento_id/relatorio', CaixaFechamentoController.getRelatorio);

module.exports = router;