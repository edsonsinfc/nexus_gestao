const express = require('express');
const router = express.Router();
const CategoriasFinanceirasController = require('../controllers/CategoriasFinanceirasController');
const { authenticateToken } = require('../src/middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar categorias
router.get('/', CategoriasFinanceirasController.listar);

// Buscar categoria específica
router.get('/:id', CategoriasFinanceirasController.buscar);

// Criar categoria
router.post('/', CategoriasFinanceirasController.criar);

// Atualizar categoria
router.put('/:id', CategoriasFinanceirasController.atualizar);

// Excluir categoria
router.delete('/:id', CategoriasFinanceirasController.excluir);

module.exports = router;
