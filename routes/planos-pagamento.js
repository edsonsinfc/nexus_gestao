const express = require('express');
const router = express.Router();
const PlanosPagamentoController = require('../controllers/PlanosPagamentoController');
const { authenticateToken } = require('../src/middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar todos os planos de pagamento
// Query params: ?tipo=vendas ou ?tipo=compras (opcional)
router.get('/', PlanosPagamentoController.listar);

// Buscar plano por ID
router.get('/:id', PlanosPagamentoController.buscar);

// Criar novo plano
router.post('/', PlanosPagamentoController.criar);

// Atualizar plano
router.put('/:id', PlanosPagamentoController.atualizar);

// Excluir plano
router.delete('/:id', PlanosPagamentoController.excluir);

module.exports = router;
