const express = require('express');
const router = express.Router();
const LancamentosFinanceirosController = require('../controllers/LancamentosFinanceirosController');
const { authenticateToken } = require('../src/middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar lançamentos
router.get('/', LancamentosFinanceirosController.listar);

// Buscar lançamento específico
router.get('/:id', LancamentosFinanceirosController.buscar);

// Criar lançamento
router.post('/', LancamentosFinanceirosController.criar);

// Atualizar lançamento
router.put('/:id', LancamentosFinanceirosController.atualizar);

// Excluir lançamento
router.delete('/:id', LancamentosFinanceirosController.excluir);

// Marcar como pago
router.patch('/:id/pagar', LancamentosFinanceirosController.marcarPago);

// Cancelar lançamento
router.patch('/:id/cancelar', LancamentosFinanceirosController.cancelar);

module.exports = router;
