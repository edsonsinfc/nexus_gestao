const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db.mysql');

const router = express.Router();

// Armazenar códigos de recuperação em memória (em produção, use Redis ou banco)
const codigosRecuperacao = new Map();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(400).json({ error: 'Informe email e senha' });

  const [rows] = await pool.execute('SELECT id, nome, email, senha, perfil, ativo, COALESCE(equipe_id, NULL) as equipe_id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
    const usr = rows[0];
    if (!usr.ativo) return res.status(403).json({ error: 'Usuário inativo' });

    const ok = await bcrypt.compare(senha, usr.senha);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: usr.id, nome: usr.nome, email: usr.email, perfil: usr.perfil, equipe_id: usr.equipe_id || undefined }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    res.json({ token, usuario: { id: usr.id, nome: usr.nome, email: usr.email, perfil: usr.perfil, equipe_id: usr.equipe_id || null } });
  } catch (e) {
    console.error('Erro login:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Rota para solicitar recuperação de senha
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Informe o email' });

    // Verificar se usuário existe
    const [rows] = await pool.execute('SELECT id, nome, email FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1', [email]);
    if (rows.length === 0) {
      // Por segurança, sempre responder sucesso mesmo se email não existir
      return res.json({ message: 'Se o email estiver cadastrado, você receberá as instruções' });
    }

    const usuario = rows[0];
    
    // Gerar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Armazenar código com expiração de 15 minutos
    const expiracao = Date.now() + (15 * 60 * 1000);
    codigosRecuperacao.set(email, { codigo, expiracao, tentativas: 0 });

    // Em produção, aqui você enviaria o email
    console.log(`🔑 Código de recuperação para ${email}: ${codigo}`);
    
    // Simular delay de envio de email
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({ message: 'Código enviado para seu email' });
  } catch (e) {
    console.error('Erro forgot-password:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Rota para redefinir senha com código
router.post('/reset-password', async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body || {};
    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({ error: 'Informe email, código e nova senha' });
    }

    // Verificar código
    const dadosCodigo = codigosRecuperacao.get(email);
    if (!dadosCodigo) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    // Verificar expiração
    if (Date.now() > dadosCodigo.expiracao) {
      codigosRecuperacao.delete(email);
      return res.status(400).json({ error: 'Código expirado' });
    }

    // Verificar tentativas (máximo 5)
    if (dadosCodigo.tentativas >= 5) {
      codigosRecuperacao.delete(email);
      return res.status(429).json({ error: 'Muitas tentativas. Solicite um novo código' });
    }

    // Verificar se código está correto
    if (dadosCodigo.codigo !== codigo) {
      dadosCodigo.tentativas++;
      return res.status(400).json({ error: 'Código incorreto' });
    }

    // Validar nova senha
    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se usuário ainda existe
    const [rows] = await pool.execute('SELECT id FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userId = rows[0].id;

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, parseInt(process.env.BCRYPT_ROUNDS || '10', 10));

    // Atualizar senha no banco
    await pool.execute('UPDATE usuarios SET senha = ?, updated_at = NOW() WHERE id = ?', [senhaHash, userId]);

    // Remover código usado
    codigosRecuperacao.delete(email);

    console.log(`✅ Senha alterada com sucesso para usuário: ${email}`);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (e) {
    console.error('Erro reset-password:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Limpeza automática de códigos expirados (executa a cada 5 minutos)
setInterval(() => {
  const agora = Date.now();
  for (const [email, dados] of codigosRecuperacao.entries()) {
    if (agora > dados.expiracao) {
      codigosRecuperacao.delete(email);
      console.log(`🧹 Código expirado removido para: ${email}`);
    }
  }
}, 5 * 60 * 1000);

module.exports = { router };
