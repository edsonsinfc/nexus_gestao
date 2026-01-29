const express = require('express');
const router = express.Router();
const ContasPagarController = require('../controllers/ContasPagarController');
const { authenticateToken } = require('../src/middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// ========================================
// LISTAGEM E BUSCA
// ========================================

// Listar contas a pagar com filtros
router.get('/', ContasPagarController.listar);

// Buscar conta específica
router.get('/:id', ContasPagarController.buscar);

// ========================================
// CRUD
// ========================================

// Criar nova conta a pagar
router.post('/', ContasPagarController.criar);

// Atualizar conta a pagar
router.put('/:id', ContasPagarController.atualizar);

// Excluir conta a pagar
router.delete('/:id', ContasPagarController.excluir);

// ========================================
// OPERAÇÕES FINANCEIRAS
// ========================================

// Baixar/pagar conta ou parcela
router.post('/:id/baixar', ContasPagarController.baixar);

// Estornar pagamento
router.post('/:id/estornar', ContasPagarController.estornar);

// ========================================
// RELATÓRIOS E DASHBOARDS
// ========================================

// Dashboard com indicadores
router.get('/dashboard/indicadores', ContasPagarController.dashboard);

// Relatório de contas vencidas
router.get('/relatorios/vencidas', ContasPagarController.relatorioVencidas);

module.exports = router;
