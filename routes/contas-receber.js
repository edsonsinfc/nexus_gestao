const express = require('express');
const router = express.Router();
const ContasReceberController = require('../controllers/ContasReceberController');
const { authenticateToken } = require('../src/middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// ========================================
// LISTAGEM E BUSCA
// ========================================

// Listar contas a receber com filtros
router.get('/', ContasReceberController.listar);

// Buscar conta específica
router.get('/:id', ContasReceberController.buscar);

// ========================================
// CRUD
// ========================================

// Criar nova conta a receber
router.post('/', ContasReceberController.criar);

// Atualizar conta a receber
router.put('/:id', ContasReceberController.atualizar);

// Cancelar conta a receber
router.post('/:id/cancelar', ContasReceberController.cancelar);

// ========================================
// OPERAÇÕES FINANCEIRAS
// ========================================

// Baixar/receber conta ou parcela
router.post('/:id/baixar', ContasReceberController.baixar);

// Estornar recebimento
router.post('/:id/estornar', ContasReceberController.estornar);

// ========================================
// RELATÓRIOS E DASHBOARDS
// ========================================

// Dashboard com indicadores
router.get('/dashboard/indicadores', ContasReceberController.dashboard);

// Relatório de inadimplência
router.get('/relatorios/inadimplencia', ContasReceberController.relatorioInadimplencia);

module.exports = router;
