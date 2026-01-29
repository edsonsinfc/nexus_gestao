const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../src/middleware/auth');
const ConfiguracoesFiscaisController = require('../controllers/ConfiguracoesFiscaisController');

const upload = multer();

router.use(authenticateToken);

// Campos básicos (JSON)
router.get('/', requirePermission('configuracoes'), ConfiguracoesFiscaisController.getAtiva);
router.put('/', requirePermission('configuracoes'), ConfiguracoesFiscaisController.updateCampos);

// Uploads
router.post('/logo', requirePermission('configuracoes'), upload.single('logo'), ConfiguracoesFiscaisController.uploadLogo);
router.delete('/logo', requirePermission('configuracoes'), ConfiguracoesFiscaisController.removerLogo);

router.post('/certificado', requirePermission('configuracoes'), upload.single('certificado'), ConfiguracoesFiscaisController.uploadCertificado);
router.delete('/certificado', requirePermission('configuracoes'), ConfiguracoesFiscaisController.removerCertificado);

// Webhook token
router.delete('/webhook-token', requirePermission('configuracoes'), ConfiguracoesFiscaisController.removerWebhookToken);

module.exports = router;
