// src/routes/viewsRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

// Servir arquivos estáticos da pasta views
router.use('/views', authenticateToken, express.static(path.join(__dirname, '../../public/views')));

// Rota para a página de nova venda
router.get('/vendas/nova', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/views/vendas/nova.html'));
});

// Rota para a página de auditoria
router.get('/auditoria', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/auditoria.html'));
});

module.exports = router;