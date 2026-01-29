// routes/nfce.js
const express = require('express');
const router = express.Router();
const NFCeController = require('../controllers/NFCeController');
const { authenticateToken, requirePermission } = require('../src/middleware/auth');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rotas de NFC-e
router.post('/gerar', requirePermission('pdv'), NFCeController.gerarNFCe);
router.post('/autorizar', requirePermission('pdv'), NFCeController.autorizar);

// Rota auxiliar: gerar NFC-e informando diretamente o ID da venda (para debug/contingência)
// Exemplo de uso (no console do navegador, após login):
// fetch('/api/nfce/gerar-por-venda/17', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ observacoes: 'Geração manual de debug' }) })
router.post('/gerar-por-venda/:vendaId', requirePermission('pdv'), async (req, res) => {
	try {
		console.log('🧾 [ROTAS/NFCE] Rota auxiliar /gerar-por-venda chamada');
		const vendaId = parseInt(req.params.vendaId, 10);
		req.body = {
			...(req.body || {}),
			venda_id: vendaId,
			observacoes: (req.body && req.body.observacoes) || ''
		};
		return NFCeController.gerarNFCe(req, res);
	} catch (err) {
		console.error('❌ [ROTAS/NFCE] Erro na rota auxiliar /gerar-por-venda:', err);
		return res.status(500).json({ error: 'Erro ao gerar NFC-e pela rota auxiliar.' });
	}
});

router.get('/', requirePermission('relatorios'), NFCeController.listar);
router.get('/:id', NFCeController.buscarPorId);
router.get('/:id/cupom', NFCeController.gerarCupom);
router.post('/:id/gerar-xml', requirePermission('pdv'), NFCeController.gerarXML);
router.post('/:id/cancelar', requirePermission('pdv'), NFCeController.cancelar);

module.exports = router;