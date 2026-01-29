const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, categoriasController.listar);
router.get('/:id', authenticateToken, categoriasController.buscarPorId);
router.post('/', authenticateToken, categoriasController.criar);
router.put('/:id', authenticateToken, categoriasController.atualizar);
router.delete('/:id', authenticateToken, categoriasController.excluir);

module.exports = router;