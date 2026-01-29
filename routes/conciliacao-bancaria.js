const express = require('express');
const router = express.Router();
const ConciliacaoController = require('../controllers/ConciliacaoController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

router.use(authenticateToken);

// Listar conciliações
router.get('/', ConciliacaoController.listar);

// Upload de extrato bancário
router.post('/upload-extrato', 
  requirePermission('financeiro'),
  ConciliacaoController.upload.single('arquivo'),
  ConciliacaoController.uploadExtrato
);

// Iniciar conciliação com matching automático
router.post('/iniciar', requirePermission('financeiro'), ConciliacaoController.iniciarConciliacao);

// Matching manual
router.post('/:id/matching', requirePermission('financeiro'), ConciliacaoController.matchingManual);

// Finalizar conciliação
router.post('/:id/finalizar', requirePermission('financeiro'), ConciliacaoController.finalizar);

module.exports = router;
