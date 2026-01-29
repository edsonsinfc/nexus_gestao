const express = require('express');
const router = express.Router();
const FormasPagamentoController = require('../controllers/FormasPagamentoController');
const { authenticateToken } = require('../src/middleware/auth');

// Proteger todas as rotas
router.use(authenticateToken);

// Rotas principais
router.get('/', FormasPagamentoController.listar);
router.get('/:id', FormasPagamentoController.buscar);
router.post('/', FormasPagamentoController.criar);
router.put('/:id', FormasPagamentoController.atualizar);
router.delete('/:id', FormasPagamentoController.excluir);

// Rotas de relacionamento com planos
router.post('/:id/planos', FormasPagamentoController.vincularPlanos);
router.get('/:id/planos-disponiveis', FormasPagamentoController.planosDisponiveis);

module.exports = router;
