// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./src/routes/authRoutes');
const produtosRoutes = require('./src/routes/produtosRoutes');
const clientesRoutes = require('./src/routes/clientesRoutes');
const vendedoresRoutes = require('./src/routes/vendedoresRoutes');
const fornecedoresRoutes = require('./src/routes/fornecedoresRoutes');
const estoqueRoutes = require('./src/routes/estoqueRoutes');
const pedidosRoutes = require('./src/routes/pedidosRoutes');
const vendasRoutes = require('./src/routes/vendasRoutes');
const comissoesRoutes = require('./src/routes/comissoesRoutes');
const caixaRoutes = require('./src/routes/caixaRoutes');
const departamentosRoutes = require('./src/routes/departamentosRoutes');
const categoriasRoutes = require('./src/routes/categoriasRoutes');
const secoesRoutes = require('./src/routes/secoesRoutes');
const setupRoutes = require('./src/routes/setupRoutes');
const viewsRoutes = require('./src/routes/viewsRoutes');
const configuracoesRoutes = require('./routes/configuracoes');
const configFiscalRoutes = require('./routes/config-fiscal');
const caixaFechamentoRoutes = require('./routes/caixa-fechamento');
const entregasRoutes = require('./routes/entregas');
const nfceRoutes = require('./routes/nfce');
const pagamentosRoutes = require('./routes/pagamentos');
const tributacaoRoutes = require('./routes/tributacao');
const auditoriaRoutes = require('./routes/auditoria');
const nfeEntradaRoutes = require('./routes/nfe-entrada');
const pedidosCompraRoutes = require('./routes/pedidos-compra');
const entradasMercadoriasRoutes = require('./routes/entradas-mercadorias');
const dreRoutes = require('./routes/dre');
const fluxoCaixaRoutes = require('./routes/fluxo-caixa');
const conciliacaoRoutes = require('./routes/conciliacao-bancaria');
const xmlContadorRoutes = require('./routes/xml-contador');
const dashboardFiscalRoutes = require('./routes/dashboard-fiscal');
const balanceteRoutes = require('./routes/balancete');
const categoriasFinanceirasRoutes = require('./routes/categorias-financeiras');
const lancamentosFinanceirosRoutes = require('./routes/lancamentos-financeiros');
const configuracoesFinanceirasRoutes = require('./routes/configuracoes-financeiras');
const contasPagarRoutes = require('./routes/contas-pagar');
const contasReceberRoutes = require('./routes/contas-receber');
const contasBancariasRoutes = require('./routes/contas-bancarias');
const planosPagamentoRoutes = require('./routes/planos-pagamento');
const formasPagamentoRoutes = require('./routes/formas-pagamento');
const dashboardRoutes = require('./routes/dashboard');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Definir JWT_SECRET se não estiver definido
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'nexus_gestao_secret_key_2024';
  console.log('JWT_SECRET definido como padrão');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*'
};
app.use(cors(corsOptions)); // Habilita o CORS configurável
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições
// Arquivos estáticos (UI)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api', authRoutes); // Rotas de autenticação
app.use('/api/produtos', produtosRoutes); // Rotas de produtos
app.use('/api/clientes', clientesRoutes); // Rotas de clientes
app.use('/api/vendedores', vendedoresRoutes); // Rotas de vendedores
app.use('/api/fornecedores', fornecedoresRoutes); // Rotas de fornecedores
app.use('/api/estoque', estoqueRoutes); // Rotas de estoque
app.use('/api/pedidos', pedidosRoutes); // Rotas de pedidos
app.use('/api/vendas', vendasRoutes); // Rotas de vendas
app.use('/api/comissoes', comissoesRoutes); // Rotas de comissões
app.use('/api/caixa', caixaRoutes); // Rotas de caixa
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/secoes', secoesRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/config-fiscal', configFiscalRoutes);
app.use('/api/caixa-fechamento', caixaFechamentoRoutes);
app.use('/api/entregas', entregasRoutes);
app.use('/api/nfce', nfceRoutes);
app.use('/api/pagamentos', pagamentosRoutes);
app.use('/api/tributacao', tributacaoRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/nfe-entrada', nfeEntradaRoutes);
app.use('/api/pedidos-compra', pedidosCompraRoutes);
app.use('/api/entradas-mercadorias', entradasMercadoriasRoutes);
app.use('/api/dre', dreRoutes);
app.use('/api/fluxo-caixa', fluxoCaixaRoutes);
app.use('/api/conciliacao-bancaria', conciliacaoRoutes);
app.use('/api/xml-contador', xmlContadorRoutes);
app.use('/api/dashboard-fiscal', dashboardFiscalRoutes);
app.use('/api/balancete', balanceteRoutes);
app.use('/api/categorias-financeiras', categoriasFinanceirasRoutes);
app.use('/api/lancamentos-financeiros', lancamentosFinanceirosRoutes);
app.use('/api/configuracoes-financeiras', configuracoesFinanceirasRoutes);
app.use('/api/contas-pagar', contasPagarRoutes);
app.use('/api/contas-receber', contasReceberRoutes);
app.use('/api/contas-bancarias', contasBancariasRoutes);
app.use('/api/planos-pagamento', planosPagamentoRoutes);
app.use('/api/formas-pagamento', formasPagamentoRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rotas de visualização
app.use('/', viewsRoutes);

// Log de todas as requisições NFC-e desativado em produção para evitar vazamento de credenciais
/*
app.use((req, res, next) => {
  if (req.url.includes('/api/nfce')) {
    console.log(`📡 Requisição NFC-e: ${req.method} ${req.url}`);
    console.log('📡 Headers Authorization:', req.headers.authorization);
    console.log('📡 Body:', req.body);
  }
  next();
});
*/

// Rota raiz para teste
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
// Reload 11/11/2025 19:45:20
