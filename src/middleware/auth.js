// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso requerido.' });
  }

  try {
    console.log('🔐 Middleware auth - Verificando token...');
    const secret = process.env.JWT_SECRET || 'nexus_gestao_secret_key_2024';
    const decoded = jwt.verify(token, secret);
    // console.log('🔐 Token decodificado:', decoded);
    
    // Buscar dados completos do usuário
    console.log('🔐 Buscando usuário no banco...');
    const [users] = await pool.query(
      'SELECT u.*, p.nome as perfil_nome FROM usuarios u LEFT JOIN perfis p ON u.perfil_id = p.id WHERE u.id = ? AND u.ativo = 1',
      [decoded.userId]
    );
    console.log('🔐 Usuários encontrados:', users.length);

    if (users.length === 0) {
      console.log('🔐 ❌ Usuário não encontrado ou inativo');
      return res.status(401).json({ message: 'Usuário não encontrado ou inativo.' });
    }

    console.log('🔐 ✅ Usuário encontrado:', users[0].nome);
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado.' });
    }
    return res.status(403).json({ message: 'Token inválido.' });
  }
};

// Middleware de autorização por perfil
const requireProfile = (requiredProfiles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    if (requiredProfiles.includes(req.user.perfil_nome)) {
      return next();
    }

    return res.status(403).json({ message: 'Acesso negado. Perfil insuficiente.' });
  };
};

// Middleware de verificação de permissão específica
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    try {
      // Buscar permissões do perfil
      const [perfis] = await pool.query(
        'SELECT permissoes FROM perfis WHERE id = ?',
        [req.user.perfil_id]
      );
      
      if (perfis.length === 0) {
        return res.status(403).json({ message: 'Perfil não encontrado.' });
      }
      
      const permissoes = JSON.parse(perfis[0].permissoes || '{}');
      
      // Administrador tem acesso total
      if (permissoes.all === true) {
        return next();
      }

      // Verificar permissão específica
      if (permissoes[permission] === true) {
        return next();
      }

      return res.status(403).json({ message: `Permissão '${permission}' requerida.` });
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return res.status(500).json({ message: 'Erro ao verificar permissões.' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireProfile,
  requirePermission
};
