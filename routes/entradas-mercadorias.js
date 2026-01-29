// routes/entradas-mercadorias.js
const express = require('express');
const router = express.Router();
const EntradasMercadoriasController = require('../controllers/EntradasMercadoriasController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

router.use(authenticateToken);

// Listar entradas
router.get('/', EntradasMercadoriasController.listar);

// Buscar por ID
router.get('/:id', EntradasMercadoriasController.buscarPorId);

// Criar entrada manual
router.post('/', requirePermission('compras'), EntradasMercadoriasController.criar);

// Pré-entrada (conferência pedido x NF-e)
router.post('/pre-entrada', requirePermission('compras'), EntradasMercadoriasController.preEntrada);

// Finalizar entrada (dar baixa no estoque)
router.post('/:id/finalizar', requirePermission('compras'), EntradasMercadoriasController.finalizar);

// Cancelar entrada
router.post('/:id/cancelar', requirePermission('compras'), EntradasMercadoriasController.cancelar);

// Deletar entrada
router.delete('/:id', requirePermission('admin'), EntradasMercadoriasController.deletar);

module.exports = router;
