# 📊 Sistema Financeiro e Fiscal - Nexus Gestão

## 🎯 Visão Geral

Sistema completo de gestão financeira e fiscal implementado, incluindo:

1. **DRE (Demonstração do Resultado do Exercício)**
2. **Fluxo de Caixa**
3. **Conciliação Bancária**
4. **Exportação de XMLs para Contador**
5. **Dashboard Fiscal Completo**

---

## 📁 Estrutura Criada

### Migrations
- `migrations/20251111_create_financeiro_fiscal.sql` - 9 tabelas criadas

### Controllers
- `controllers/DREController.js` - Geração de DRE por período
- `controllers/FluxoCaixaController.js` - Gestão de entradas/saídas
- `controllers/ConciliacaoController.js` - Conciliação bancária com upload
- `controllers/XMLContadorController.js` - Exportação e envio de XMLs
- `controllers/DashboardFiscalController.js` - Estatísticas fiscais

### Rotas
- `routes/dre.js`
- `routes/fluxo-caixa.js`
- `routes/conciliacao-bancaria.js`
- `routes/xml-contador.js`
- `routes/dashboard-fiscal.js`

### Interfaces Web
- `public/dashboard-fiscal.html` - Dashboard visual com gráficos
- `public/xml-contador.html` - Exportação de XMLs

---

## 🗄️ Banco de Dados

### Tabelas Criadas

#### 1. **contas_bancarias**
- Gestão de contas bancárias da empresa
- Campos: banco, agência, conta, saldo_atual, tipo_conta

#### 2. **categorias_financeiras**
- Categorias hierárquicas para DRE
- 26 categorias padrão inseridas (Receitas, Custos, Despesas)
- Grupos DRE: RECEITA_BRUTA, DEDUCOES, CMV, DESPESA_OPERACIONAL, etc.

#### 3. **lancamentos_financeiros**
- Lançamentos de receitas e despesas
- Vincula com vendas, compras, NFC-e, NF-e
- Status: PENDENTE, PAGO, CANCELADO
- Campos para conciliação bancária

#### 4. **extratos_bancarios**
- Upload de extratos OFX/CSV
- Hash para evitar duplicatas
- Campos: data, valor, tipo_movimento, saldo_dia

#### 5. **conciliacoes_bancarias**
- Header da conciliação
- Status: EM_ANDAMENTO, CONCLUIDA, COM_DIVERGENCIA
- Saldos e diferenças

#### 6. **conciliacoes_itens**
- Matching entre lançamentos e extratos
- Tipo: AUTOMATICO ou MANUAL

#### 7. **xml_envios_contador**
- Controle de envios de XMLs
- Email, período, quantidade, status

#### 8. **xml_envios_detalhes**
- Detalhes de cada XML enviado
- Chave de acesso, CFOP, valor, ST

#### 9. **estatisticas_fiscais_cache**
- Cache de estatísticas mensais (performance)
- Agregações por CFOP e CST

---

## 🚀 APIs Disponíveis

### DRE

#### `GET /api/dre`
Gera DRE completo por período com:
- Receita Bruta, Deduções, Receita Líquida
- CMV, Lucro Bruto
- Despesas Operacionais (detalhadas)
- Lucro Operacional
- Resultado Financeiro
- Resultado Líquido
- Margens: bruta, operacional, líquida

**Query Params:**
- `data_inicio` (obrigatório)
- `data_fim` (obrigatório)

**Resposta:**
```json
{
  "dre": {
    "periodo": { "data_inicio": "2025-01-01", "data_fim": "2025-01-31" },
    "receita_bruta": { "valor": 100000, "percentual": 100 },
    "cmv": { "valor": 60000, "percentual": 60 },
    "lucro_bruto": { "valor": 40000, "margem": 40 },
    "despesas_operacionais": {
      "detalhes": [...],
      "total": 15000
    },
    "resultado_liquido": { "valor": 25000, "margem": 25 }
  }
}
```

#### `GET /api/dre/comparar`
Compara DRE entre dois períodos

#### `GET /api/dre/categorias`
Lista categorias financeiras

---

### Fluxo de Caixa

#### `GET /api/fluxo-caixa`
Gera fluxo de caixa realizado ou projetado

**Query Params:**
- `data_inicio`, `data_fim` (obrigatórios)
- `conta_bancaria_id` (opcional)
- `tipo_visualizacao` = `realizado` | `projetado` (default: realizado)

**Resposta:**
```json
{
  "fluxo_caixa": {
    "resumo": {
      "saldo_inicial": 10000,
      "total_entradas": 50000,
      "total_saidas": 30000,
      "saldo_final": 30000
    },
    "entradas": [...],
    "saidas": [...],
    "fluxo_diario": [
      { "data": "2025-01-01", "entradas": 1000, "saidas": 500, "saldo_acumulado": 10500 }
    ]
  }
}
```

#### `POST /api/fluxo-caixa/lancamentos`
Cria lançamento financeiro

**Body:**
```json
{
  "tipo": "RECEITA" | "DESPESA",
  "categoria_id": 1,
  "conta_bancaria_id": 1,
  "descricao": "Venda de mercadorias",
  "valor": 1500.00,
  "data_lancamento": "2025-01-15",
  "status": "PAGO"
}
```

#### `PUT /api/fluxo-caixa/lancamentos/:id`
Atualiza lançamento (atualiza saldo da conta automaticamente)

#### `DELETE /api/fluxo-caixa/lancamentos/:id`
Deleta lançamento (reverte saldo se estava pago)

---

### Conciliação Bancária

#### `GET /api/conciliacao-bancaria`
Lista conciliações

#### `POST /api/conciliacao-bancaria/upload-extrato`
Upload de extrato bancário (CSV ou OFX)

**Form Data:**
- `arquivo` (file): Arquivo CSV/OFX
- `conta_bancaria_id`: ID da conta

**Formato CSV esperado:**
```csv
data;descricao;valor;tipo
2025-01-15;VENDA CARTAO;1500.00;CREDITO
2025-01-16;PAGAMENTO FORNECEDOR;-800.00;DEBITO
```

#### `POST /api/conciliacao-bancaria/iniciar`
Inicia conciliação com matching automático

**Body:**
```json
{
  "conta_bancaria_id": 1,
  "periodo_inicio": "2025-01-01",
  "periodo_fim": "2025-01-31"
}
```

**Matching Automático:**
- Compara valor (tolerância de R$ 0,01)
- Compara tipo (receita=crédito, despesa=débito)
- Data com diferença de até 3 dias

#### `POST /api/conciliacao-bancaria/:id/matching`
Matching manual entre lançamento e extrato

#### `POST /api/conciliacao-bancaria/:id/finalizar`
Finaliza conciliação

---

### Exportação XML para Contador

#### `GET /api/xml-contador/preview`
Preview de XMLs disponíveis

**Query Params:**
- `data_inicio`, `data_fim`

**Resposta:**
```json
{
  "xmls": [
    { "tipo": "NFCE", "numero": "123", "chave_acesso": "...", "valor_total": 150.00 }
  ],
  "stats": {
    "total_nfce": 10,
    "total_nfe": 5,
    "valor_total_nfce": 15000,
    "valor_total_nfe": 50000
  }
}
```

#### `POST /api/xml-contador/enviar`
Gera ZIP e envia por email

**Body:**
```json
{
  "data_inicio": "2025-01-01",
  "data_fim": "2025-01-31",
  "email_contador": "contador@escritorio.com.br",
  "email_copia": "gerente@empresa.com.br"
}
```

**Processo:**
1. Busca XMLs autorizados no período
2. Cria estrutura: ZIP/NFCE/xxx.xml e ZIP/NFE/xxx.xml
3. Compacta em arquivo ZIP
4. Envia por email via SMTP
5. Registra histórico

**Variáveis de Ambiente Necessárias:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app
```

#### `GET /api/xml-contador/historico`
Histórico de envios

#### `GET /api/xml-contador/:id`
Detalhes de um envio específico

---

### Dashboard Fiscal

#### `GET /api/dashboard-fiscal`
Dashboard completo com estatísticas fiscais

**Query Params:**
- `data_inicio`, `data_fim`

**Resposta:**
```json
{
  "dashboard": {
    "totalizadores": {
      "nfce": { "quantidade": 150, "valor_total": 75000, "valor_icms": 5400 },
      "nfe": { "quantidade": 20, "valor_total": 100000 },
      "geral": { "quantidade": 170, "valor_total": 175000 }
    },
    "cfops": [
      { "cfop": "5102", "quantidade_notas": 100, "valor_total": 50000, "valor_icms": 3600 }
    ],
    "situacoes_tributarias": [
      { "cst": "00", "valor_total": 30000, "valor_icms": 2160, "valor_icms_st": 0 }
    ],
    "evolucao_diaria": [...],
    "top_produtos": [...],
    "formas_pagamento": [...],
    "aliquotas_icms": [...]
  }
}
```

#### `POST /api/dashboard-fiscal/atualizar-cache`
Atualiza cache de estatísticas (job mensal)

**Body:**
```json
{
  "mes": 1,
  "ano": 2025
}
```

#### `GET /api/dashboard-fiscal/relatorio-sped`
Gera relatório no formato SPED/SINTEGRA

---

## 🎨 Interfaces Web

### 1. Dashboard Fiscal (`/dashboard-fiscal.html`)

**Recursos:**
- ✅ 4 cards totalizadores (NFC-e, NF-e, Faturamento, ICMS)
- ✅ 4 gráficos interativos (Chart.js):
  - Distribuição por CFOP (barras)
  - Situações Tributárias (rosca)
  - Formas de Pagamento (pizza)
  - Evolução Diária (linha)
- ✅ 3 tabelas detalhadas:
  - CFOP com valores
  - CST com base e alíquotas
  - Top 10 produtos
- ✅ Filtros de período
- ✅ Design moderno e responsivo

### 2. Exportação XML (`/xml-contador.html`)

**Recursos:**
- ✅ Formulário com período e emails
- ✅ Preview de XMLs antes do envio
- ✅ Cards com estatísticas (quantidade NFC-e, NF-e, valor total)
- ✅ Histórico de envios com status visual
- ✅ Detalhamento de cada envio

---

## ⚙️ Configuração

### 1. Executar Migration
```bash
node scripts/run-migration-financeiro.js
```

### 2. Configurar SMTP (para envio de emails)
Adicionar no `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app
```

### 3. Criar Contas Bancárias
```sql
INSERT INTO contas_bancarias (banco_codigo, banco_nome, agencia, conta, saldo_inicial, saldo_atual)
VALUES ('001', 'Banco do Brasil', '1234', '56789-0', 10000.00, 10000.00);
```

### 4. Popular Lançamentos (exemplo)
```javascript
POST /api/fluxo-caixa/lancamentos
{
  "tipo": "RECEITA",
  "categoria_id": 1, // Receita de Vendas
  "conta_bancaria_id": 1,
  "descricao": "Venda à vista",
  "valor": 1500.00,
  "data_lancamento": "2025-01-15",
  "status": "PAGO"
}
```

---

## 📊 Casos de Uso

### Uso 1: Gerar DRE Mensal
```javascript
GET /api/dre?data_inicio=2025-01-01&data_fim=2025-01-31
```

### Uso 2: Acompanhar Fluxo de Caixa Diário
```javascript
GET /api/fluxo-caixa?data_inicio=2025-01-01&data_fim=2025-01-31&tipo_visualizacao=realizado
```

### Uso 3: Conciliar Extrato Bancário
1. Upload do extrato:
```javascript
POST /api/conciliacao-bancaria/upload-extrato
FormData: arquivo=extrato.csv, conta_bancaria_id=1
```

2. Iniciar conciliação (matching automático):
```javascript
POST /api/conciliacao-bancaria/iniciar
{ "conta_bancaria_id": 1, "periodo_inicio": "2025-01-01", "periodo_fim": "2025-01-31" }
```

3. Matching manual (se necessário):
```javascript
POST /api/conciliacao-bancaria/1/matching
{ "lancamento_id": 10, "extrato_id": 25 }
```

4. Finalizar:
```javascript
POST /api/conciliacao-bancaria/1/finalizar
```

### Uso 4: Enviar XMLs para Contador
1. Acessar `/xml-contador.html`
2. Selecionar período (ex: mês anterior)
3. Clicar "Visualizar XMLs Disponíveis"
4. Informar email do contador
5. Clicar "Enviar para Contador"
6. Sistema gera ZIP e envia automaticamente

### Uso 5: Analisar Desempenho Fiscal
1. Acessar `/dashboard-fiscal.html`
2. Selecionar período
3. Visualizar:
   - Faturamento total
   - ICMS recolhido
   - CFOPs mais utilizados
   - Situações tributárias
   - Top produtos
   - Evolução diária

---

## 🔐 Permissões

- **DRE**: Qualquer usuário autenticado
- **Fluxo de Caixa**: Leitura (todos), Escrita (permissão `financeiro`)
- **Conciliação**: Permissão `financeiro`
- **Exportação XML**: Permissão `admin`
- **Dashboard Fiscal**: Qualquer usuário autenticado

---

## 📦 Dependências Instaladas

```json
{
  "banking": "^1.0.0",      // Parse OFX (em desenvolvimento)
  "csv-parser": "^3.0.0",   // Parse CSV
  "archiver": "^6.0.0",     // Criar arquivos ZIP
  "nodemailer": "^6.9.0"    // Envio de emails
}
```

---

## 🎯 Próximos Passos Sugeridos

1. **Interfaces Adicionais:**
   - DRE com visualização hierárquica
   - Fluxo de Caixa com gráfico de timeline
   - Conciliação com drag-and-drop

2. **Integrações:**
   - API bancária para importação automática de extratos
   - Integração com SPED Contábil
   - Export para Excel/PDF

3. **Automações:**
   - Job mensal para atualizar cache de estatísticas
   - Alertas de divergências na conciliação
   - Relatórios automáticos por email

4. **Melhorias:**
   - Parser completo de OFX (atualmente apenas CSV)
   - Conciliação com ML para matching inteligente
   - Dashboard com mais KPIs (DRE + Fluxo integrados)

---

## ✅ Sistema Pronto para Uso!

**O que está funcionando:**
- ✅ 9 tabelas criadas e populadas
- ✅ 5 controllers completos
- ✅ 5 conjuntos de rotas
- ✅ 2 interfaces web responsivas
- ✅ APIs RESTful documentadas
- ✅ Integração com sistema existente (NFC-e, NF-e, Vendas)

**Teste agora:**
1. Acesse `/dashboard-fiscal.html`
2. Selecione período do mês atual
3. Visualize estatísticas em tempo real!

---

**Desenvolvido para Nexus Gestão ERP** 
*Sistema completo de gestão financeira e fiscal* 💼📊
