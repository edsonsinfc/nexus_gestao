const express = require('express');
const router = express.Router();
const departamentosController = require('../controllers/departamentosController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, departamentosController.listar);
router.get('/:id', authenticateToken, departamentosController.buscarPorId);
router.post('/', authenticateToken, departamentosController.criar);
router.put('/:id', authenticateToken, departamentosController.atualizar);
router.delete('/:id', authenticateToken, departamentosController.excluir);

module.exports = router;