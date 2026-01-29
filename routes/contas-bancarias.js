const express = require('express');
const router = express.Router();
const ContasBancariasController = require('../controllers/ContasBancariasController');
const { authenticateToken } = require('../src/middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar todas as contas bancárias
router.get('/', ContasBancariasController.listar);

// Buscar conta por ID
router.get('/:id', ContasBancariasController.buscar);

// Criar nova conta
router.post('/', ContasBancariasController.criar);

// Atualizar conta
router.put('/:id', ContasBancariasController.atualizar);

// Excluir conta
router.delete('/:id', ContasBancariasController.excluir);

module.exports = router;
