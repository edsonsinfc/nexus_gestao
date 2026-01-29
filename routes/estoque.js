const express = require('express');
const router = express.Router();
const EstoqueController = require('../controllers/EstoqueController');
const { authenticateToken } = require('../src/middleware/auth');

// =====================================================
// DASHBOARD E RELATÓRIOS
// =====================================================

router.get('/dashboard', authenticateToken, EstoqueController.dashboard);
router.get('/relatorio', authenticateToken, EstoqueController.relatorioEstoque);
router.get('/relatorio/movimentacoes', authenticateToken, EstoqueController.relatorioMovimentacoes);

// =====================================================
// MOVIMENTAÇÕES
// =====================================================

router.get('/movimentacoes', authenticateToken, EstoqueController.listarMovimentacoes);
router.post('/movimentacoes', authenticateToken, EstoqueController.registrarMovimentacao);

// =====================================================
// PRODUTOS E ESTOQUE
// =====================================================

router.get('/produtos', authenticateToken, EstoqueController.listarProdutosEstoque);

// =====================================================
// AJUSTES
// =====================================================

router.post('/ajuste', authenticateToken, EstoqueController.ajusteManual);

// =====================================================
// INVENTÁRIO
// =====================================================

router.post('/inventario', authenticateToken, EstoqueController.criarInventario);
router.get('/inventario', authenticateToken, EstoqueController.listarInventarios);
router.get('/inventario/:id', authenticateToken, EstoqueController.obterInventario);
router.post('/inventario/:id/contagem', authenticateToken, EstoqueController.registrarContagem);
router.post('/inventario/:id/concluir', authenticateToken, EstoqueController.concluirInventario);

// =====================================================
// ALERTAS
// =====================================================

router.get('/alertas', authenticateToken, EstoqueController.listarAlertas);
router.put('/alertas/:id/resolver', authenticateToken, EstoqueController.resolverAlerta);

// =====================================================
// LOTES
// =====================================================

router.post('/lotes', authenticateToken, EstoqueController.criarLote);
router.get('/lotes', authenticateToken, EstoqueController.listarLotes);

module.exports = router;
