const express = require('express');
const router = express.Router();
const BalanceteController = require('../controllers/BalanceteController');
const { authenticateToken } = require('../src/middleware/auth');

// Todas as rotas protegidas por autenticação
router.use(authenticateToken);

// Gerar balancete
router.get('/', BalanceteController.gerarBalancete);

module.exports = router;
