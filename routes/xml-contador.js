const express = require('express');
const router = express.Router();
const XMLContadorController = require('../controllers/XMLContadorController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

router.use(authenticateToken);

// Preview de XMLs disponíveis
router.get('/preview', XMLContadorController.previewXMLs);

// Enviar para contador
router.post('/enviar', requirePermission('admin'), XMLContadorController.enviarParaContador);

// Histórico de envios
router.get('/historico', XMLContadorController.historico);

// Detalhes de um envio
router.get('/:id', XMLContadorController.detalhes);

module.exports = router;
