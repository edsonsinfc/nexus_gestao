require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { router: authRoutes } = require('./routes/auth');
const { router: equipesRoutes } = require('./routes/equipes');
const { router: pedidosRoutes } = require('./routes/pedidos');
const { router: produtosRoutes } = require('./routes/produtos');
const { router: notificacoesRoutes } = require('./routes/notificacoes');
const { router: usuariosRoutes } = require('./routes/usuarios');
const { router: uploadRoutes } = require('./routes/upload');

const app = express();

const PORT = process.env.PORT || 3100;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Rota raiz redireciona para login
app.get('/', (req, res) => res.redirect('/login.html'));

app.use('/api/auth', authRoutes);
app.use('/api/equipes', equipesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => console.log(`🚀 Nexus_B2b rodando em http://localhost:${PORT}`));
