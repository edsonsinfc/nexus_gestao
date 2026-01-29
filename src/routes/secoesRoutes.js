const express = require('express');
const router = express.Router();
const secoesController = require('../controllers/secoesController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, secoesController.listar);
router.get('/:id', authenticateToken, secoesController.buscarPorId);
router.post('/', authenticateToken, secoesController.criar);
router.put('/:id', authenticateToken, secoesController.atualizar);
router.delete('/:id', authenticateToken, secoesController.excluir);

module.exports = router;
