const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticateToken } = require('../src/middleware/auth');

router.get('/estatisticas', authenticateToken, DashboardController.obterEstatisticas);

module.exports = router;
