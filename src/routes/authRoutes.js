// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota de Login: POST /api/login
router.post('/login', authController.login);
// Rota de Recuperação de Senha: POST /api/recover
router.post('/recover', authController.recover);

module.exports = router;