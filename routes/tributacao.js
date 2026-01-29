// routes/tributacao.js
const express = require('express');
const router = express.Router();
const TributacaoController = require('../controllers/TributacaoController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

router.use(authenticateToken, requirePermission('configuracoes'));

// Figuras Entrada
router.get('/figuras/entrada', TributacaoController.listarFigurasEntrada);
router.post('/figuras/entrada', TributacaoController.criarFiguraEntrada);
router.put('/figuras/entrada/:id', TributacaoController.atualizarFiguraEntrada);
router.delete('/figuras/entrada/:id', TributacaoController.excluirFiguraEntrada);

// NCM maps Entrada
router.get('/figuras/entrada/:id/ncm', TributacaoController.listarNcmEntrada);
router.post('/figuras/entrada/:id/ncm', TributacaoController.adicionarNcmEntrada);
router.delete('/figuras/entrada/:id/ncm/:mapId', TributacaoController.removerNcmEntrada);

// Figuras Saída
router.get('/figuras/saida', TributacaoController.listarFigurasSaida);
router.post('/figuras/saida', TributacaoController.criarFiguraSaida);
router.put('/figuras/saida/:id', TributacaoController.atualizarFiguraSaida);
router.delete('/figuras/saida/:id', TributacaoController.excluirFiguraSaida);

// NCM maps Saída
router.get('/figuras/saida/:id/ncm', TributacaoController.listarNcmSaida);
router.post('/figuras/saida/:id/ncm', TributacaoController.adicionarNcmSaida);
router.delete('/figuras/saida/:id/ncm/:mapId', TributacaoController.removerNcmSaida);

// Vínculos Produto
router.get('/produtos/:produtoId/figuras', TributacaoController.obterFigurasProduto);
router.post('/produtos/:produtoId/figuras', TributacaoController.atribuirFigurasProduto);

// Preview/Diagnóstico
router.get('/preview/saida', TributacaoController.previewResolverSaida);

module.exports = router;
