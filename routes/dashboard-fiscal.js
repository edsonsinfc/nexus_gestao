const express = require('express');
const router = express.Router();
const DashboardFiscalController = require('../controllers/DashboardFiscalController');
const { authenticateToken } = require('../src/middleware/auth');

router.use(authenticateToken);

// Dashboard principal
router.get('/', DashboardFiscalController.gerarDashboard);

// Atualizar cache (job mensal)
router.post('/atualizar-cache', DashboardFiscalController.atualizarCache);

// Relatório SPED/SINTEGRA
router.get('/relatorio-sped', DashboardFiscalController.relatorioSPED);

module.exports = router;
