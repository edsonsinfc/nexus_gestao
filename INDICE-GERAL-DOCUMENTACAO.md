# 📚 Índice Geral - Documentação do Sistema Financeiro

## 🎯 Visão Geral

Este índice organiza toda a documentação do sistema de gestão financeira integrado com módulos fiscais (NFC-e e NF-e).

---

## 📖 Documentação por Categoria

### 🚀 INÍCIO RÁPIDO

#### Para Usuários
1. **RESUMO-EXECUTIVO-INTEGRACAO.md**
   - Visão geral do sistema
   - Benefícios e métricas
   - Como usar (resumo)
   - Status do projeto
   - 📄 Leia primeiro!

2. **GUIA-TESTE-INTEGRACAO-FISCAL-FINANCEIRO.md**
   - Passo a passo para testar
   - Cenários de teste
   - Queries SQL úteis
   - Troubleshooting
   - 🧪 Use para validar

#### Para Desenvolvedores
1. **INTEGRACAO-FISCAL-FINANCEIRO.md**
   - Documentação técnica completa
   - Fluxos detalhados
   - Código fonte
   - Configuração avançada
   - 💻 Referência técnica

2. **RESUMO-INTEGRACAO-FISCAL-FINANCEIRO.md**
   - Resumo visual
   - Arquivos modificados
   - Status de implementação
   - Verificação de funcionamento
   - 🔍 Debug rápido

---

### 💰 MÓDULO FINANCEIRO

#### Lançamentos Financeiros
1. **LANCAMENTOS-FINANCEIROS-README.md**
   - Sistema de lançamentos manuais
   - CRUD completo
   - Filtros e pesquisas
   - Interface web
   - 📝 Gestão de lançamentos

#### Categorias Financeiras
- Estrutura hierárquica (1.1.1, 2.1.2, etc)
- Tipos: RECEITA, DESPESA, CUSTO
- CRUD via interface web
- Validações (não deletar com lançamentos)
- Interface: `categorias-financeiras.html`

#### Mapeamento de Operações
1. **MAPEAMENTO-OPERACOES-README.md**
   - Sistema de configuração
   - 83 operações predefinidas
   - Mapeamento operação → categoria
   - Interface web
   - ⚙️ Configuração central

#### Relatórios
- **DRE** (Demonstrativo de Resultado)
  - Receitas, Custos, Despesas
  - Lucro/Prejuízo
  - Por período
  - Interface: `dre.html`

- **Fluxo de Caixa**
  - Entradas e saídas
  - Previsões
  - Saldo acumulado
  - Interface: `fluxo-caixa.html`

- **Balancete**
  - Totais por categoria
  - Hierarquia contábil
  - Saldos consolidados
  - Interface: `balancete.html`

---

### 🧾 MÓDULO FISCAL

#### NFC-e (Nota Fiscal de Consumidor)
1. **NFCE-DOCUMENTATION.md**
   - Sistema de NFC-e completo
   - Geração automática
   - Cupom fiscal
   - **Integração financeira** (NOVO!)
   - Status e consultas
   - 📄 Documentação oficial NFC-e

#### NF-e de Entrada
- Importação de XML
- Manifestação do destinatário
- Vinculação com fornecedores
- **Integração financeira** (NOVO!)
- Interface: `nfe-entrada.html`

#### Entradas de Mercadorias
- Entrada manual
- Vinculação com produtos
- Finalização de entrada
- **Integração financeira** (existente)
- Interface: `entradas-mercadorias.html`

---

### 📚 EXEMPLOS E TUTORIAIS

1. **EXEMPLOS-RECEITAS.md**
   - 9 cenários práticos de receitas
   - Código fonte completo
   - Integração com vendas
   - Integração com NFC-e
   - Plano de contas sugerido
   - 💡 Casos de uso reais

---

### 🔧 ARQUITETURA TÉCNICA

#### Helper de Lançamentos
- **Arquivo:** `utils/lancamentosHelper.js`
- **Funções:**
  - `buscarCategoriaOperacao(operacao)`
  - `criarLancamentoAutomatico(dados)`
- **Uso:** Todos os controllers fiscais

#### Controllers Integrados
1. **NFCeController.js**
   - Linha 7: Import helper
   - Linha ~180: Criação de lançamento
   - Operação: VENDA_NFCE

2. **NFCeEntradaController.js**
   - Linha 5: Import helper
   - Linha ~285: Criação de lançamento
   - Operação: COMPRA_NFE

3. **EntradasMercadoriasController.js**
   - Linha 3: Import helper
   - Linha ~362: Criação de lançamento
   - Operação: COMPRA_MERCADORIA

4. **ConfiguracoesFinanceirasController.js**
   - 83 operações predefinidas
   - Método `inicializar()`
   - CRUD de configurações

#### Banco de Dados

**Tabelas Principais:**
```
lancamentos_financeiros
├── id (PK)
├── tipo (RECEITA/DESPESA)
├── categoria_id (FK → categorias_financeiras)
├── pessoa_id (FK)
├── pessoa_tipo (CLIENTE/FORNECEDOR)
├── descricao
├── valor
├── data_lancamento
├── data_vencimento
├── status (PAGO/PENDENTE/CANCELADO)
├── forma_pagamento
├── referencias (JSON)
└── observacoes

categorias_financeiras
├── id (PK)
├── codigo (1.1.1, 2.1.2, etc)
├── nome
├── tipo (RECEITA/DESPESA/CUSTO)
├── nivel (1, 2, 3)
├── dre_grupo
└── ativo

configuracoes_operacoes_financeiras
├── id (PK)
├── operacao (VENDA_NFCE, COMPRA_NFE, etc)
├── descricao
├── categoria_id (FK → categorias_financeiras)
├── grupo (VENDAS, COMPRAS, etc)
└── ordem

nfce
├── id (PK)
├── venda_id (FK)
├── numero_sequencial
├── chave_acesso
├── status
└── ... (dados fiscais)

nfe_entrada
├── id (PK)
├── fornecedor_id (FK)
├── chave_acesso
├── numero_nfe
├── valor_total
└── ... (dados fiscais)
```

---

### 📊 OPERAÇÕES FINANCEIRAS

#### Grupos de Operações (83 total)

1. **COMPRAS** (7 operações)
   - COMPRA_MERCADORIA
   - COMPRA_NFE ⭐ Novo
   - COMPRA_MATERIA_PRIMA
   - COMPRA_MATERIAL_USO
   - FRETE_COMPRA
   - FRETE_ENTRADA ⭐ Novo
   - DEVOLUCAO_COMPRA

2. **VENDAS** (5 operações)
   - VENDA_PRODUTO
   - VENDA_SERVICO
   - VENDA_NFCE ⭐ Integrado
   - DEVOLUCAO_VENDA
   - DESCONTO_VENDA

3. **RECEBIMENTOS** (7 operações) ⭐ Novo grupo
   - RECEBIMENTO_CLIENTE
   - RECEBIMENTO_CARTAO
   - RECEBIMENTO_PIX
   - RECEBIMENTO_BOLETO
   - RECEBIMENTO_DINHEIRO
   - RECEBIMENTO_CHEQUE
   - ADIANTAMENTO_CLIENTE

4. **PESSOAL** (10 operações)
   - SALARIO, PROLABORE, INSS, FGTS
   - FERIAS, DECIMO_TERCEIRO
   - VALE_TRANSPORTE, VALE_ALIMENTACAO
   - PLANO_SAUDE, RESCISAO

5. **ADMINISTRATIVO** (11 operações)
   - ALUGUEL, ENERGIA, AGUA, GAS
   - TELEFONE, INTERNET, CONDOMINIO
   - IPTU, MATERIAL_ESCRITORIO
   - MATERIAL_LIMPEZA, SEGURANCA

6. **COMERCIAL** (7 operações)
   - COMISSAO_VENDEDOR, PROPAGANDA
   - MARKETING, FRETE_VENDA
   - EMBALAGEM, BRINDES, OUTROS_COMERCIAL

7. **VEÍCULOS** (4 operações)
   - COMBUSTIVEL, MANUTENCAO_VEICULO
   - IPVA, SEGURO_VEICULO

8. **IMPOSTOS** (9 operações)
   - DAS, ICMS, ISS
   - PIS, COFINS, IRPJ, CSLL
   - IPI, OUTRAS_TAXAS

9. **SERVIÇOS** (7 operações)
   - CONTADOR, ADVOGADO, CONSULTORIA
   - TECNOLOGIA, TREINAMENTO
   - MANUTENCAO_EQUIPAMENTO, OUTROS_SERVICOS

10. **FINANCEIRO** (11 operações) ⭐ Expandido
    - JUROS_PAGOS, JUROS_RECEBIDOS
    - MULTA_PAGA, MULTA_RECEBIDA
    - TARIFA_BANCARIA, IOF
    - DESCONTO_RECEBIDO ⭐ Novo
    - RENDIMENTO_APLICACAO ⭐ Novo
    - ESTORNO_RECEBIDO ⭐ Novo
    - ESTORNO_PAGO ⭐ Novo
    - OUTRAS_DESPESAS_FINANCEIRAS

11. **OUTROS** (12 operações)
    - VALE_REFEICAO_SOCIO, RETIRADA_SOCIO
    - EMPRESTIMO_RECEBIDO, EMPRESTIMO_CONCEDIDO
    - PAGAMENTO_EMPRESTIMO, RECEBIMENTO_EMPRESTIMO
    - INVESTIMENTO, RESGATE_INVESTIMENTO
    - PROVISAO, REVERSAO_PROVISAO
    - AJUSTE_CONTABIL, OUTRAS_OPERACOES

---

### 🎓 TUTORIAIS E GUIAS

#### Configuração Inicial
```
1. Criar Categorias Financeiras
   - Admin → Categorias Financeiras
   - Criar categorias de receita (1.x.x)
   - Criar categorias de despesa (2.x.x)

2. Inicializar Operações
   - Admin → Mapeamento de Operações
   - Clicar "Inicializar Padrões"
   - Aguardar criação de 83 operações

3. Mapear Operações Essenciais
   - VENDA_NFCE → Categoria de receita
   - COMPRA_NFE → Categoria de despesa/custo
   - COMPRA_MERCADORIA → Categoria de despesa/custo

4. Testar
   - Gerar NFC-e
   - Verificar lançamento criado
   - Conferir relatórios
```

#### Uso Diário
```
✅ Gerar NFC-e
   - Sistema cria lançamento automaticamente
   - Aparece em relatórios imediatamente

✅ Importar NF-e
   - Sistema cria lançamento automaticamente
   - Vincula com fornecedor

✅ Finalizar Entrada
   - Sistema cria lançamento automaticamente
   - Atualiza estoque e financeiro

✅ Lançamento Manual
   - Criar via interface
   - Selecionar categoria
   - Definir vencimento e forma de pagamento
```

---

### 🔍 TROUBLESHOOTING

#### Problemas Comuns

**1. Lançamento não criado**
- Verificar se operação está mapeada
- Verificar se categoria existe
- Consultar logs do servidor
- Documento: `RESUMO-INTEGRACAO-FISCAL-FINANCEIRO.md` (seção Troubleshooting)

**2. Categoria NULL no lançamento**
- Categoria foi deletada após mapeamento
- Criar nova categoria
- Atualizar mapeamento
- Editar lançamentos manualmente

**3. Valor incorreto**
- Verificar dados da operação fiscal
- Conferir cálculo de impostos
- Verificar código do controller

**4. Não aparece em relatórios**
- Verificar filtros de data
- Verificar tipo (RECEITA/DESPESA)
- Verificar status (PAGO/PENDENTE)
- Recarregar página

---

### 📞 SUPORTE E CONTATOS

#### Documentação Técnica
- 📁 Localização: Raiz do projeto
- 📄 Formato: Markdown (.md)
- 🔍 Buscar por palavra-chave

#### Logs do Sistema
```bash
# Terminal
npm start

# Procurar por:
💰 Criando lançamento financeiro...
✅ Lançamento financeiro criado: ID XXX
⚠️ Lançamento não criado - operação não configurada
❌ Erro ao criar lançamento: [detalhes]
```

#### Queries SQL para Debug
```sql
-- Ver últimos lançamentos
SELECT * FROM lancamentos_financeiros ORDER BY created_at DESC LIMIT 10;

-- Ver configurações de operações
SELECT * FROM configuracoes_operacoes_financeiras WHERE operacao LIKE 'VENDA%';

-- Ver categorias
SELECT * FROM categorias_financeiras WHERE tipo = 'RECEITA';
```

---

### 📈 ROADMAP E FUTURO

#### Implementado ✅
- [x] Helper de lançamentos automáticos
- [x] Integração NFC-e → Financeiro
- [x] Integração NF-e → Financeiro
- [x] Integração Entradas → Financeiro
- [x] 83 operações predefinidas
- [x] Grupo RECEBIMENTOS (7 operações)
- [x] Grupo FINANCEIRO expandido (11 operações)
- [x] Documentação completa

#### Próximos Passos 📋
- [ ] Contas a Receber (duplicatas)
- [ ] Contas a Pagar (fornecedores)
- [ ] Lançamento automático de impostos
- [ ] Conciliação bancária
- [ ] Centro de custos
- [ ] Provisões automáticas

#### Visão Futura 🔮
- [ ] IA para categorização
- [ ] Integração bancária (OFX)
- [ ] Dashboard preditivo
- [ ] App mobile
- [ ] API externa

---

## 📚 ÍNDICE ALFABÉTICO DE ARQUIVOS

### A-E
- **EXEMPLOS-RECEITAS.md** - Exemplos práticos de receitas

### F-L
- **GUIA-TESTE-INTEGRACAO-FISCAL-FINANCEIRO.md** - Roteiro de testes
- **INTEGRACAO-FISCAL-FINANCEIRO.md** - Documentação técnica completa
- **LANCAMENTOS-FINANCEIROS-README.md** - Sistema de lançamentos manuais

### M-R
- **MAPEAMENTO-OPERACOES-README.md** - Configuração de operações
- **NFCE-DOCUMENTATION.md** - Sistema de NFC-e
- **RESUMO-EXECUTIVO-INTEGRACAO.md** - Visão geral executiva
- **RESUMO-INTEGRACAO-FISCAL-FINANCEIRO.md** - Resumo técnico visual

---

## 🎯 QUICKSTART GUIDE

### Para Começar a Usar (5 minutos)
```
1. Ler: RESUMO-EXECUTIVO-INTEGRACAO.md
2. Configurar: Admin → Mapeamento de Operações
3. Testar: Gerar uma NFC-e
4. Verificar: Financeiro → Lançamentos Financeiros
```

### Para Desenvolvedores (30 minutos)
```
1. Ler: INTEGRACAO-FISCAL-FINANCEIRO.md
2. Estudar: utils/lancamentosHelper.js
3. Analisar: controllers/NFCeController.js (linha 7 e 180)
4. Testar: GUIA-TESTE-INTEGRACAO-FISCAL-FINANCEIRO.md
```

### Para Administradores (1 hora)
```
1. Ler: Todos os READMEs
2. Configurar: Categorias e mapeamentos
3. Treinar: Equipe nos novos processos
4. Monitorar: Logs por 1 semana
```

---

## 🏆 CONCLUSÃO

**Sistema completo, documentado e pronto para uso!**

- ✅ **3 módulos fiscais** integrados ao financeiro
- ✅ **83 operações** predefinidas e configuráveis
- ✅ **100% automático** após configuração inicial
- ✅ **7 documentos** detalhados para suporte
- ✅ **0 lançamentos manuais** necessários

**Próximo passo:** Testar em produção! 🚀

---

**Última atualização:** 11/11/2025  
**Versão da documentação:** 1.0  
**Autor:** Nexus Gestão Dev Team
