// src/routes/vendasRoutes.js
const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendasController');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/db');

// Função para executar script SQL
async function executarScript(scriptPath) {
  const sql = await fs.readFile(scriptPath, 'utf8');
  const comandos = sql.split(';').filter(cmd => cmd.trim());
  
  for (const comando of comandos) {
    if (comando.trim()) {
      await pool.query(comando);
    }
  }
}

// Rota para corrigir tabela produtos
router.post('/fix-produtos', authenticateToken, async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../../scripts/fix_produtos.sql');
    await executarScript(scriptPath);
    res.json({ message: 'Tabela produtos corrigida com sucesso!' });
  } catch (error) {
    console.error('Erro ao corrigir tabela produtos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de configuração
router.post('/setup', authenticateToken, vendasController.criarTabelas);

// Rotas de apoio
router.get('/condicoes-pagamento', vendasController.buscarCondicoesPagamento);
router.get('/formas-pagamento', vendasController.buscarFormasPagamento);
router.get('/produtos-ativos', vendasController.buscarProdutosAtivos);
router.get('/clientes-ativos', vendasController.buscarClientesAtivos);
router.get('/vendedores-ativos', vendasController.buscarVendedoresAtivos);

// Rotas de vendas
router.get('/', vendasController.listar);
router.get('/:id', vendasController.buscarPorId);
router.post('/', requirePermission('vendas'), vendasController.criar);
router.put('/:id/cancelar', requirePermission('vendas'), vendasController.cancelar);

module.exports = router;

