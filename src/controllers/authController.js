// src/controllers/authController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  console.log('\n--------------------------------------');
  console.log('--- INICIANDO PROCESSO DE LOGIN ---');
  const { login, senha } = req.body;

  // LOG 1: O que a API recebeu?
  
console.log('O valor da minha variável é:', login);
  if (!login || !senha) {
    return res.status(400).json({ message: 'Login e senha são obrigatórios.' });
  }

  try {
    console.log('2. Buscando usuário no banco de dados...');
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE login = ? AND ativo = 1', [login]);
    const user = rows[0];

    if (!user) {
      console.error('!!! FALHA: Usuário não encontrado no banco.');
      console.log('--------------------------------------');
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // LOG 2: O que o banco retornou?
    console.log('3. Usuário encontrado:', user);

    // LOG 3: Qual é o hash que está no banco?
    console.log('4. Hash do banco:', user.senha);
    console.log('   Tamanho do hash:', user.senha.length);

    console.log('5. Comparando a senha recebida com o hash do banco...');
    const isMatch = await bcrypt.compare(senha, user.senha);

    // LOG 4: Qual foi o resultado da comparação?
    console.log('6. Resultado da comparação (isMatch):', isMatch);
    console.log('--------------------------------------');

    if (!isMatch) {
      console.error('!!! FALHA: bcrypt.compare retornou false.');
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // Se chegou até aqui, o login deu certo.
    const payload = { userId: user.id, perfilId: user.perfil_id, nome: user.nome };
    const token = jwt.sign(payload, 'nexus_gestao_secret_key_2024', { expiresIn: '8h' });

    return res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token,
      user: { id: user.id, nome: user.nome, login: user.login }
    });

  } catch (error) {
    console.error('!!! FALHA CRÍTICA NO BLOCO TRY/CATCH:', error);
    console.log('--------------------------------------');
    return res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

// Placeholder de recuperação de senha
exports.recover = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'E-mail é obrigatório.' });
  }
  // Aqui você poderia gerar um token, salvar no banco e enviar e-mail.
  // Para agora, respondemos de forma amigável sem vazar existência de conta.
  return res.status(200).json({ message: 'Se existir uma conta, enviaremos instruções para o e-mail informado.' });
};