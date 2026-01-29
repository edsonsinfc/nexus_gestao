// routes/pedidos-compra.js
const express = require('express');
const router = express.Router();
const PedidosCompraController = require('../controllers/PedidosCompraController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

router.use(authenticateToken);

// Listar pedidos
router.get('/', PedidosCompraController.listar);

// Buscar por ID
router.get('/:id', PedidosCompraController.buscarPorId);

// Criar pedido
router.post('/', requirePermission('compras'), PedidosCompraController.criar);

// Atualizar pedido
router.put('/:id', requirePermission('compras'), PedidosCompraController.atualizar);

// Aprovar pedido
router.post('/:id/aprovar', requirePermission('admin'), PedidosCompraController.aprovar);

// Enviar pedido
router.post('/:id/enviar', requirePermission('compras'), PedidosCompraController.enviar);

// Cancelar pedido
router.post('/:id/cancelar', requirePermission('compras'), PedidosCompraController.cancelar);

// Deletar pedido
router.delete('/:id', requirePermission('admin'), PedidosCompraController.deletar);

module.exports = router;
