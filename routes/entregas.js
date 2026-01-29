const express = require('express');
const router = express.Router();
const EntregaController = require('../controllers/EntregaController');
const authMiddleware = require('../middlewares/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de entregas
router.post('/', EntregaController.criarEntrega);
router.put('/:entrega_id/realizar', EntregaController.realizarEntrega);
router.get('/:entrega_id', EntregaController.getDetalhes);
router.get('/:entrega_id/comprovante', EntregaController.gerarComprovante);
router.get('/relatorios/pendentes', EntregaController.getPendentes);

module.exports = router;