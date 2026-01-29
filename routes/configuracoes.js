const express = require('express');
const router = express.Router();
const ConfiguracaoController = require('../controllers/ConfiguracaoController');
const { authenticateToken } = require('../src/middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de configuração
router.get('/', ConfiguracaoController.getAll);
router.post('/', ConfiguracaoController.update);

module.exports = router;