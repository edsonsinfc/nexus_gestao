const express = require('express');
const router = express.Router();
const DREController = require('../controllers/DREController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Gerar DRE
router.get('/', DREController.gerarDRE);

// Comparar períodos
router.get('/comparar', DREController.compararPeriodos);

// Listar categorias financeiras
router.get('/categorias', DREController.listarCategorias);

module.exports = router;
