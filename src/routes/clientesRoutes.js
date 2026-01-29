// src/routes/clientesRoutes.js
const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de clientes
router.get('/', clientesController.listar);
router.get('/:id', clientesController.buscarPorId);
router.get('/codigo/:codigo', clientesController.buscarPorCodigo);
router.get('/:id/historico', clientesController.historico);

// Rotas que requerem permissão de cadastros
router.post('/', requirePermission('cadastros'), clientesController.criar);
router.put('/:id', requirePermission('cadastros'), clientesController.atualizar);
router.delete('/:id', requirePermission('cadastros'), clientesController.excluir);

module.exports = router;

