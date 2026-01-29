# 💰 Integração Fiscal-Financeiro

## 🎯 Visão Geral

Sistema de integração automática entre módulos fiscais (NFC-e e NF-e) e módulo financeiro, eliminando lançamentos manuais e garantindo consistência contábil.

---

## 🔄 Fluxo de Integração

```
┌─────────────────┐
│   Operação      │
│   Fiscal        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Configuração    │
│ de Operações    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Categoria     │
│   Financeira    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lançamento     │
│  Automático     │
└─────────────────┘
```

---

## 📤 NFC-e (Vendas - Saídas)

### Operação: `VENDA_NFCE`

#### ✅ Quando é criado:
- Ao gerar NFC-e através do método `NFCeController.gerarNFCe()`
- Automaticamente após inserir registro na tabela `nfce`

#### 📊 Dados do Lançamento:
| Campo | Valor | Origem |
|-------|-------|--------|
| **operacao** | `VENDA_NFCE` | Fixo |
| **tipo** | `RECEITA` | Fixo |
| **descricao** | `Venda NFC-e #000123 - Cliente João` | Número sequencial + Nome consumidor |
| **valor** | `R$ 1.250,00` | `venda.valor_total` |
| **data_lancamento** | `2025-11-11` | Data de emissão |
| **pessoa_id** | `123` | `venda.cliente_id` (se houver) |
| **pessoa_tipo** | `CLIENTE` | Fixo |
| **categoria_id** | `5` | Configurado pelo usuário |
| **referencias** | `{"venda_id": 999, "nfce_id": 456}` | IDs relacionados |
| **observacoes** | `NFC-e Série 1 Número 123` | Dados fiscais |

#### 🔧 Configuração:
1. Acessar **Admin → Mapeamento de Operações**
2. Localizar **VENDA_NFCE** no grupo **VENDAS**
3. Selecionar categoria: **"1.1.1 - Receita de Vendas"** ou similar
4. Salvar (auto-save)

#### 📝 Exemplo de Uso:
```javascript
// controllers/NFCeController.js - linha ~180
await criarLancamentoAutomatico({
  operacao: 'VENDA_NFCE',
  descricao: `Venda NFC-e #${numeroSequencial.toString().padStart(6, '0')} - ${consumidor}`,
  valor: venda.valor_total,
  data_lancamento: moment().format('YYYY-MM-DD'),
  tipo: 'RECEITA',
  pessoa_id: venda.cliente_id || null,
  pessoa_tipo: venda.cliente_id ? 'CLIENTE' : null,
  usuario_id: usuario_id,
  referencias: {
    venda_id: venda_id,
    nfce_id: nfceId,
    chave_acesso: chaveAcesso
  },
  observacoes: `NFC-e Série ${config.serie_nfce} Número ${numeroSequencial}`
});
```

---

## 📥 NF-e de Entrada (Compras)

### Operação: `COMPRA_NFE`

#### ✅ Quando é criado:
- Ao importar XML de NF-e através do método `NFCeEntradaController.uploadXml()`
- Automaticamente após inserir registro na tabela `nfe_entrada`

#### 📊 Dados do Lançamento:
| Campo | Valor | Origem |
|-------|-------|--------|
| **operacao** | `COMPRA_NFE` | Fixo |
| **tipo** | `DESPESA` | Fixo |
| **descricao** | `Compra NF-e #12345 - Fornecedor XYZ Ltda` | Número + Razão social |
| **valor** | `R$ 15.250,00` | `total.vNF` (valor total da nota) |
| **data_lancamento** | `2025-11-10` | `ide.dhEmi` (data de emissão) |
| **pessoa_id** | `88` | ID do fornecedor (se cadastrado) |
| **pessoa_tipo** | `FORNECEDOR` | Fixo |
| **categoria_id** | `12` | Configurado pelo usuário |
| **referencias** | `{"nfe_entrada_id": 55, "chave_acesso": "..."}` | IDs relacionados |
| **observacoes** | `NF-e 12345 Série 1 - Compra de mercadorias` | Natureza da operação |

#### 🔧 Configuração:
1. Acessar **Admin → Mapeamento de Operações**
2. Localizar **COMPRA_NFE** no grupo **COMPRAS**
3. Selecionar categoria: **"2.1.1 - Compra de Mercadorias"** ou similar
4. Salvar (auto-save)

#### 📝 Exemplo de Uso:
```javascript
// controllers/NFCeEntradaController.js - linha ~285
await criarLancamentoAutomatico({
  operacao: 'COMPRA_NFE',
  descricao: `Compra NF-e #${ide.nNF[0]} - ${emit.xNome[0]}`,
  valor: parseFloat(total.vNF[0]),
  data_lancamento: ide.dhEmi[0].split('T')[0],
  tipo: 'DESPESA',
  pessoa_id: fornecedores[0]?.id || null,
  pessoa_tipo: fornecedores[0]?.id ? 'FORNECEDOR' : null,
  usuario_id: req.userId,
  referencias: {
    nfe_entrada_id: nfeId,
    chave_acesso: chaveAcesso,
    numero_nfe: ide.nNF[0],
    serie: ide.serie[0]
  },
  observacoes: `NF-e ${ide.nNF[0]} Série ${ide.serie[0]} - ${ide.natOp[0]}`
});
```

---

## 🛒 Entrada de Mercadorias (Manual)

### Operação: `COMPRA_MERCADORIA`

#### ✅ Quando é criado:
- Ao finalizar entrada de mercadoria através do método `EntradasMercadoriasController.finalizar()`
- Automaticamente após atualizar status para `FINALIZADA`

#### 📊 Dados do Lançamento:
| Campo | Valor | Origem |
|-------|-------|--------|
| **operacao** | `COMPRA_MERCADORIA` | Fixo |
| **tipo** | `DESPESA` | Fixo |
| **descricao** | `Entrada #00045 - Fornecedor ABC Ltda` | Número + Fornecedor |
| **valor** | `R$ 5.450,00` | Valor total da entrada |
| **data_lancamento** | `2025-11-11` | Data da entrada |
| **pessoa_id** | `77` | ID do fornecedor |
| **pessoa_tipo** | `FORNECEDOR` | Fixo |
| **categoria_id** | `12` | Configurado pelo usuário |
| **referencias** | `{"entrada_id": 45}` | ID da entrada |

#### 🔧 Configuração:
1. Acessar **Admin → Mapeamento de Operações**
2. Localizar **COMPRA_MERCADORIA** no grupo **COMPRAS**
3. Selecionar categoria: **"2.1.1 - Compra de Mercadorias"**
4. Salvar (auto-save)

---

## 📋 Operações Fiscais Disponíveis

### Grupo: COMPRAS

| Operação | Descrição | Tipo | Uso |
|----------|-----------|------|-----|
| `COMPRA_MERCADORIA` | Compra de Mercadorias para Revenda | DESPESA | Entrada manual de mercadorias |
| `COMPRA_NFE` | Compra via NF-e de Entrada | DESPESA | Importação de XML de NF-e |
| `COMPRA_MATERIA_PRIMA` | Compra de Matéria-Prima | DESPESA | Indústria |
| `COMPRA_MATERIAL_USO` | Compra de Material de Uso e Consumo | DESPESA | Material escritório, limpeza |
| `FRETE_COMPRA` | Frete sobre Compras | DESPESA | Frete adicional na compra |
| `FRETE_ENTRADA` | Frete sobre NF-e de Entrada | DESPESA | Frete destacado na NF-e |
| `DEVOLUCAO_COMPRA` | Devolução de Compras | RECEITA | Devolução ao fornecedor |

### Grupo: VENDAS

| Operação | Descrição | Tipo | Uso |
|----------|-----------|------|-----|
| `VENDA_PRODUTO` | Venda de Produtos | RECEITA | Venda padrão |
| `VENDA_SERVICO` | Venda de Serviços | RECEITA | Prestação de serviços |
| `VENDA_NFCE` | Venda NFC-e (Varejo) | RECEITA | Emissão de NFC-e |
| `DEVOLUCAO_VENDA` | Devolução de Vendas | DESPESA | Devolução de cliente |
| `DESCONTO_VENDA` | Descontos Concedidos | DESPESA | Descontos comerciais |

---

## 🔧 Funcionamento do Helper

### Arquivo: `utils/lancamentosHelper.js`

#### Função: `criarLancamentoAutomatico(dados)`

**Fluxo:**
1. ✅ Recebe dados da operação fiscal
2. ✅ Busca categoria configurada na tabela `configuracoes_operacoes_financeiras`
3. ✅ Se encontrar categoria, cria lançamento na tabela `lancamentos_financeiros`
4. ✅ Retorna ID do lançamento criado ou `null`

**Validações:**
- ❌ Se operação não estiver configurada → Loga aviso, não cria lançamento
- ❌ Se categoria não existir → Loga erro, não cria lançamento
- ✅ Se tudo OK → Cria lançamento e retorna ID

**Exemplo:**
```javascript
const { criarLancamentoAutomatico } = require('../utils/lancamentosHelper');

const lancamentoId = await criarLancamentoAutomatico({
  operacao: 'VENDA_NFCE',
  descricao: 'Venda NFC-e #000123',
  valor: 1500.00,
  data_lancamento: '2025-11-11',
  tipo: 'RECEITA',
  pessoa_id: 123,
  pessoa_tipo: 'CLIENTE',
  usuario_id: 1,
  referencias: { venda_id: 999, nfce_id: 456 }
});

if (lancamentoId) {
  console.log('✅ Lançamento criado:', lancamentoId);
} else {
  console.warn('⚠️ Operação VENDA_NFCE não configurada');
}
```

---

## 📊 Impacto nos Relatórios

### DRE (Demonstrativo de Resultado)
- ✅ Receitas de vendas (NFC-e) aparecem automaticamente
- ✅ Custos de mercadorias (NF-e entrada) aparecem automaticamente
- ✅ Estrutura por categoria financeira
- ✅ Período selecionável

### Fluxo de Caixa
- ✅ Entradas (vendas NFC-e)
- ✅ Saídas (compras NF-e)
- ✅ Filtros por data
- ✅ Previsão de pagamentos/recebimentos

### Balancete
- ✅ Totais por categoria
- ✅ Hierarquia contábil
- ✅ Saldo consolidado
- ✅ Comparativo por período

### Lançamentos Financeiros
- ✅ Lista completa de lançamentos
- ✅ Filtros por tipo, status, data
- ✅ Vinculação com documentos fiscais
- ✅ Conciliação bancária

---

## ⚙️ Configuração Inicial

### Passo a Passo Completo:

#### 1️⃣ Criar Categorias Financeiras
```
Admin → Categorias Financeiras → Adicionar

Exemplos:
- 1.1.1 - Receita de Vendas (RECEITA)
- 2.1.1 - Compra de Mercadorias (DESPESA/CUSTO)
- 2.1.2 - Fretes sobre Compras (DESPESA/CUSTO)
```

#### 2️⃣ Inicializar Operações Padrão
```
Admin → Mapeamento de Operações → Inicializar Padrões
```

Isso cria todas as 80+ operações predefinidas no sistema.

#### 3️⃣ Mapear Operações Fiscais
```
Admin → Mapeamento de Operações

Configurar no mínimo:
✅ VENDA_NFCE → 1.1.1 - Receita de Vendas
✅ COMPRA_NFE → 2.1.1 - Compra de Mercadorias
✅ COMPRA_MERCADORIA → 2.1.1 - Compra de Mercadorias
✅ FRETE_ENTRADA → 2.1.2 - Fretes sobre Compras
```

#### 4️⃣ Testar Integração
1. Emitir uma NFC-e
2. Acessar **Financeiro → Lançamentos Financeiros**
3. Verificar se lançamento foi criado automaticamente
4. Conferir categoria, valor e vinculação

---

## 🚀 Próximas Integrações

### Em Desenvolvimento:
- [ ] Integração com Contas a Receber (duplicatas)
- [ ] Integração com Contas a Pagar (fornecedores)
- [ ] Lançamento automático de impostos (DAS, ICMS, etc.)
- [ ] Integração com módulo de vendas (sem NFC-e)
- [ ] Conciliação bancária automática

### Planejadas:
- [ ] Integração com folha de pagamento
- [ ] Lançamento de despesas recorrentes
- [ ] Provisões automáticas (férias, 13º)
- [ ] Centro de custos por operação
- [ ] Rateio de despesas

---

## 📞 Suporte

Para dúvidas sobre configuração ou funcionamento:
1. Verificar logs do servidor: `console.log` das operações
2. Consultar tabela `configuracoes_operacoes_financeiras`
3. Verificar categoria está mapeada
4. Testar com uma venda/compra simples

---

## ✅ Checklist de Verificação

- [x] Helper `lancamentosHelper.js` criado
- [x] NFCeController integrado
- [x] NFCeEntradaController integrado
- [x] EntradasMercadoriasController integrado
- [x] Operações COMPRA_NFE e FRETE_ENTRADA criadas
- [x] Documentação atualizada
- [ ] Testes em ambiente de produção
- [ ] Treinamento de usuários

---

**Última atualização:** 11/11/2025
**Versão:** 2.0
**Autor:** Nexus Gestão Dev Team
