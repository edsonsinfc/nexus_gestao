// routes/nfe-entrada.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const NFCeEntradaController = require('../controllers/NFCeEntradaController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

// Configurar upload de XML
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/xml-nfe/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'nfe-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.xml') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'));
    }
  }
});

// Rotas públicas (com autenticação)
router.use(authenticateToken);

// Listar NF-es
router.get('/', NFCeEntradaController.listar);

// Buscar por ID
router.get('/:id', NFCeEntradaController.buscarPorId);

// Buscar itens do XML para associação
router.get('/:id/itens-xml', NFCeEntradaController.buscarItensXML);

// Associar itens do XML aos produtos
router.post('/:id/associar-itens', NFCeEntradaController.associarItensXML);

// Criar entrada manual
router.post('/manual', NFCeEntradaController.criarEntradaManual);

// Criar entrada manual completa (com itens)
router.post('/manual-completa', NFCeEntradaController.criarEntradaManualCompleta);

// Upload de XML
router.post('/upload', upload.single('xml'), NFCeEntradaController.uploadXML);

// NOVAS ROTAS - INTEGRAÇÃO SEFAZ
router.get('/sefaz/consultar', NFCeEntradaController.consultarSefaz);
router.post('/sefaz/importar', NFCeEntradaController.importarDaSefaz);
router.post('/sefaz/manifestar', NFCeEntradaController.manifestar);
router.get('/sefaz/certificado', NFCeEntradaController.verificarCertificado);
router.get('/sefaz/download/:chaveNFe', NFCeEntradaController.downloadXMLSefaz);

// Consultar SEFAZ (antigo - manter compatibilidade)
router.post('/consultar-sefaz', requirePermission('compras'), NFCeEntradaController.consultarSEFAZ);

// Manifestar destinatário (antigo - manter compatibilidade)
router.post('/:id/manifestar', requirePermission('compras'), NFCeEntradaController.manifestar);

// Importar para entrada de mercadoria
router.post('/:id/importar', requirePermission('compras'), NFCeEntradaController.importarParaEntrada);

// Deletar
router.delete('/:id', requirePermission('admin'), NFCeEntradaController.deletar);

module.exports = router;
