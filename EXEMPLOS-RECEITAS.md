# Exemplos de Uso - Receitas e Operações Financeiras

## 🎯 Cenários Práticos de Receitas

### 1. 💰 RECEBIMENTO DE VENDAS

#### Cenário: Cliente pagou uma venda à vista

**Operação:** `RECEBIMENTO_CLIENTE` ou `RECEBIMENTO_PIX`

```javascript
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');

// Ao registrar recebimento de cliente
await criarLancamentoAutomatico({
  operacao: 'RECEBIMENTO_PIX',
  descricao: 'Recebimento Venda #12345 - Cliente João Silva',
  valor: 1500.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 123, // ID do cliente
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  referencias: {
    venda_id: 12345
  }
});
```

**Resultado:**
- ✅ Lançamento de RECEITA criado
- ✅ Categoria: "Recebimento de Clientes" (configurada pelo usuário)
- ✅ Status: PENDENTE → pode marcar como PAGO quando compensar

---

### 2. 💳 RECEBIMENTO VIA CARTÃO

#### Cenário: Cliente pagou com cartão de crédito

**Operação:** `RECEBIMENTO_CARTAO`

```javascript
await criarLancamentoAutomatico({
  operacao: 'RECEBIMENTO_CARTAO',
  descricao: 'Recebimento Cartão Crédito - Venda #12346',
  valor: 2500.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 124,
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  observacoes: 'Visa terminado em 1234 - Taxa 3.5%',
  referencias: {
    venda_id: 12346,
    nfce_id: 456
  }
});
```

**Configuração recomendada:**
- Categoria: "1.1.1 - Receita de Vendas" ou "1.1.2 - Recebimento via Cartão"

---

### 3. 💵 JUROS RECEBIDOS

#### Cenário: Cliente pagou com atraso e gerou juros

**Operação:** `JUROS_RECEBIDOS`

```javascript
// Juros sobre pagamento em atraso
await criarLancamentoAutomatico({
  operacao: 'JUROS_RECEBIDOS',
  descricao: 'Juros por atraso - Cliente Maria Santos',
  valor: 45.50,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 125,
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  observacoes: 'Referente a venda #12300 - 15 dias de atraso'
});
```

**Configuração recomendada:**
- Categoria: "1.3.1 - Juros Ativos" ou "Receitas Financeiras"

---

### 4. 📊 MULTA RECEBIDA

#### Cenário: Cliente pagou boleto com multa

**Operação:** `MULTA_RECEBIDA`

```javascript
await criarLancamentoAutomatico({
  operacao: 'MULTA_RECEBIDA',
  descricao: 'Multa por atraso - Boleto vencido',
  valor: 25.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 126,
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  observacoes: 'Multa de 2% sobre R$ 1.250,00'
});
```

---

### 5. 🏦 RENDIMENTO DE APLICAÇÃO

#### Cenário: Rendimento da poupança/investimento

**Operação:** `RENDIMENTO_APLICACAO`

```javascript
await criarLancamentoAutomatico({
  operacao: 'RENDIMENTO_APLICACAO',
  descricao: 'Rendimento CDB Banco Brasil - Outubro/2025',
  valor: 350.75,
  data_lancamento: '2025-11-01',
  tipo: 'RECEITA',
  usuario_id: 1,
  observacoes: 'Taxa CDI 100% - Aplicação #123456'
});
```

**Configuração recomendada:**
- Categoria: "1.3.2 - Rendimentos de Aplicações Financeiras"

---

### 6. 🎁 DESCONTO RECEBIDO

#### Cenário: Fornecedor concedeu desconto na compra

**Operação:** `DESCONTO_RECEBIDO`

```javascript
await criarLancamentoAutomatico({
  operacao: 'DESCONTO_RECEBIDO',
  descricao: 'Desconto obtido na compra - Fornecedor XYZ',
  valor: 500.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 200,
  pessoa_tipo: 'FORNECEDOR',
  usuario_id: 1,
  observacoes: 'Desconto de 10% por pagamento à vista'
});
```

**Configuração recomendada:**
- Categoria: "1.3.3 - Descontos Obtidos"

---

### 7. 💸 VENDA DE PRODUTOS (NFC-e)

#### Cenário: Venda no PDV com emissão de NFC-e

**Operação:** `VENDA_NFCE`

```javascript
// Ao emitir NFC-e, criar recebimento automaticamente
await criarLancamentoAutomatico({
  operacao: 'VENDA_NFCE',
  descricao: 'Venda PDV NFC-e #000123 - Cliente João',
  valor: 850.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 127,
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  referencias: {
    nfce_id: 123
  },
  observacoes: 'Pagamento à vista - Dinheiro'
});
```

**Configuração recomendada:**
- Categoria: "1.1.1 - Receita de Vendas" ou "1.1.3 - Vendas PDV"

---

### 8. 🔄 ESTORNO RECEBIDO

#### Cenário: Banco estornou uma tarifa cobrada indevidamente

**Operação:** `ESTORNO_RECEBIDO`

```javascript
await criarLancamentoAutomatico({
  operacao: 'ESTORNO_RECEBIDO',
  descricao: 'Estorno de tarifa bancária - Banco XYZ',
  valor: 15.90,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  usuario_id: 1,
  observacoes: 'Estorno ref. tarifa cobrada em duplicidade'
});
```

---

### 9. 💰 ADIANTAMENTO DE CLIENTE

#### Cenário: Cliente pagou adiantado

**Operação:** `ADIANTAMENTO_CLIENTE`

```javascript
await criarLancamentoAutomatico({
  operacao: 'ADIANTAMENTO_CLIENTE',
  descricao: 'Adiantamento Cliente Pedro - Pedido #999',
  valor: 5000.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 128,
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  observacoes: 'Sinal de 50% do pedido total R$ 10.000,00'
});
```

**Configuração recomendada:**
- Categoria: "1.2.1 - Adiantamentos de Clientes"

---

## 🔧 Integração com Sistema de Vendas

### Exemplo: Criar recebimento ao finalizar venda

```javascript
// controllers/VendasController.js
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');

async finalizarVenda(req, res) {
  const { venda_id, forma_pagamento, valor_total, cliente_id } = req.body;
  
  try {
    // Finalizar venda...
    
    // Determinar operação baseada na forma de pagamento
    let operacao = 'RECEBIMENTO_CLIENTE';
    
    switch(forma_pagamento) {
      case 'PIX':
        operacao = 'RECEBIMENTO_PIX';
        break;
      case 'CARTAO_CREDITO':
      case 'CARTAO_DEBITO':
        operacao = 'RECEBIMENTO_CARTAO';
        break;
      case 'BOLETO':
        operacao = 'RECEBIMENTO_BOLETO';
        break;
      case 'DINHEIRO':
        operacao = 'RECEBIMENTO_DINHEIRO';
        break;
      case 'CHEQUE':
        operacao = 'RECEBIMENTO_CHEQUE';
        break;
    }
    
    // Criar lançamento automático
    await criarLancamentoAutomatico({
      operacao: operacao,
      descricao: `Recebimento Venda #${venda_id}`,
      valor: valor_total,
      data_lancamento: new Date().toISOString().split('T')[0],
      tipo: 'RECEITA',
      pessoa_id: cliente_id,
      pessoa_tipo: 'CLIENTE',
      usuario_id: req.userId,
      referencias: {
        venda_id: venda_id
      }
    });
    
    res.json({ success: true, message: 'Venda finalizada e receita registrada' });
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao finalizar venda' });
  }
}
```

---

## 🔧 Integração com NFC-e

### Exemplo: Criar recebimento ao autorizar NFC-e

```javascript
// controllers/NFCeController.js
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');

async autorizarNFCe(req, res) {
  const { nfce_id } = req.params;
  
  try {
    // Buscar dados da NFC-e
    const nfce = await buscarNFCe(nfce_id);
    
    // Autorizar NFC-e...
    
    // Criar recebimento automático
    await criarLancamentoAutomatico({
      operacao: 'VENDA_NFCE',
      descricao: `Venda NFC-e #${nfce.numero} - ${nfce.cliente_nome || 'Cliente não identificado'}`,
      valor: nfce.valor_total,
      data_lancamento: nfce.data_emissao,
      tipo: 'RECEITA',
      pessoa_id: nfce.cliente_id,
      pessoa_tipo: 'CLIENTE',
      usuario_id: req.userId,
      referencias: {
        nfce_id: nfce_id
      },
      observacoes: `Chave: ${nfce.chave_acesso}`
    });
    
    res.json({ success: true, message: 'NFC-e autorizada e receita registrada' });
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao autorizar NFC-e' });
  }
}
```

---

## 📊 Exemplos de Configuração de Categorias

### Sugestão de Plano de Contas - RECEITAS

```
1.0.0 - RECEITAS
│
├── 1.1.0 - Receita Operacional
│   ├── 1.1.1 - Receita de Vendas de Produtos
│   ├── 1.1.2 - Receita de Vendas de Serviços
│   └── 1.1.3 - Receita de Vendas PDV (NFC-e)
│
├── 1.2.0 - Receitas de Recebimentos
│   ├── 1.2.1 - Recebimento de Clientes
│   ├── 1.2.2 - Recebimento via PIX
│   ├── 1.2.3 - Recebimento via Cartão
│   ├── 1.2.4 - Recebimento via Boleto
│   ├── 1.2.5 - Recebimento em Dinheiro
│   └── 1.2.6 - Adiantamentos Recebidos
│
└── 1.3.0 - Receitas Financeiras
    ├── 1.3.1 - Juros Ativos (Recebidos)
    ├── 1.3.2 - Multas Ativas (Recebidas)
    ├── 1.3.3 - Descontos Obtidos
    ├── 1.3.4 - Rendimentos de Aplicações
    └── 1.3.5 - Estornos Recebidos
```

### Como Configurar:

1. **Criar Categorias no Sistema:**
   - Acessar "Categorias Financeiras"
   - Criar cada categoria acima
   - Definir como RECEITA

2. **Mapear Operações:**
   - Acessar "Mapeamento de Operações"
   - Clicar em "Inicializar Padrões"
   - Configurar cada operação:
     * `VENDA_PRODUTO` → "1.1.1 - Receita de Vendas de Produtos"
     * `VENDA_NFCE` → "1.1.3 - Receita de Vendas PDV"
     * `RECEBIMENTO_CLIENTE` → "1.2.1 - Recebimento de Clientes"
     * `RECEBIMENTO_PIX` → "1.2.2 - Recebimento via PIX"
     * `JUROS_RECEBIDOS` → "1.3.1 - Juros Ativos"
     * `RENDIMENTO_APLICACAO` → "1.3.4 - Rendimentos de Aplicações"

3. **Pronto!** Todas as vendas e recebimentos serão classificados automaticamente.

---

## 🎯 Resumo - Operações de RECEITA

| Operação | Descrição | Quando Usar |
|----------|-----------|-------------|
| `VENDA_PRODUTO` | Venda de Produtos | Ao finalizar venda de produto |
| `VENDA_SERVICO` | Venda de Serviços | Ao finalizar venda de serviço |
| `VENDA_NFCE` | Venda NFC-e | Ao autorizar NFC-e no PDV |
| `RECEBIMENTO_CLIENTE` | Recebimento Geral | Recebimento de duplicata/boleto |
| `RECEBIMENTO_PIX` | Recebimento via PIX | Cliente pagou via PIX |
| `RECEBIMENTO_CARTAO` | Recebimento Cartão | Cliente pagou com cartão |
| `RECEBIMENTO_BOLETO` | Recebimento Boleto | Cliente pagou boleto |
| `RECEBIMENTO_DINHEIRO` | Recebimento Dinheiro | Cliente pagou em espécie |
| `RECEBIMENTO_CHEQUE` | Recebimento Cheque | Cliente pagou com cheque |
| `ADIANTAMENTO_CLIENTE` | Adiantamento | Cliente pagou antecipado |
| `JUROS_RECEBIDOS` | Juros Ativos | Cliente pagou com atraso |
| `MULTA_RECEBIDA` | Multas Ativas | Multa por atraso |
| `DESCONTO_RECEBIDO` | Descontos Obtidos | Desconto do fornecedor |
| `RENDIMENTO_APLICACAO` | Rendimentos | Rendimento de investimento |
| `ESTORNO_RECEBIDO` | Estornos | Estorno de tarifa/cobrança |

---

## ✅ Checklist de Implementação

- [x] Operações de receita criadas no controller
- [x] Helper para criar lançamentos automáticos
- [x] Documentação de uso
- [ ] Integrar com controller de Vendas
- [ ] Integrar com controller de NFC-e
- [ ] Integrar com módulo de Contas a Receber
- [ ] Criar relatório de recebimentos por forma de pagamento
- [ ] Dashboard de receitas por operação

---

**Próximo passo:** Integrar as operações de receita com os módulos de Vendas e NFC-e! 🚀
