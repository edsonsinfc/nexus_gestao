const express = require('express');
const router = express.Router();
const ConfiguracoesFinanceirasController = require('../controllers/ConfiguracoesFinanceirasController');
const { authenticateToken } = require('../src/middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar contas bancárias
router.get('/contas-bancarias', ConfiguracoesFinanceirasController.listarContasBancarias);

// Listar todas as configurações
router.get('/', ConfiguracoesFinanceirasController.listar);

// Buscar configuração por operação
router.get('/:operacao', ConfiguracoesFinanceirasController.buscarPorOperacao);

// Atualizar configuração
router.post('/', ConfiguracoesFinanceirasController.atualizar);

// Inicializar configurações padrão
router.post('/inicializar', ConfiguracoesFinanceirasController.inicializar);

module.exports = router;
