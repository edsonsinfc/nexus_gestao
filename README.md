# 🏢 Nexus Gestão - Backend

Sistema completo de gestão empresarial (ERP) com módulos fiscal, financeiro, estoque e vendas.

---

## 🎯 Visão Geral

O Nexus Gestão é um ERP moderno e integrado que oferece:

- 🧾 **Fiscal:** Emissão de NFC-e e importação de NF-e
- 💰 **Financeiro:** Lançamentos automáticos, DRE, Fluxo de Caixa, Balancete
- 📦 **Estoque:** Controle de produtos, entradas e saídas
- 🛒 **Vendas:** PDV integrado com emissão fiscal
- 🔄 **Integração:** Fiscal ↔ Financeiro 100% automático

---

## ✨ Principais Funcionalidades

### 🔗 Integração Fiscal-Financeiro (NOVO!)
- ✅ Lançamentos financeiros automáticos ao emitir NFC-e
- ✅ Lançamentos automáticos ao importar NF-e de entrada
- ✅ Lançamentos automáticos ao finalizar entrada de mercadorias
- ✅ 83 operações predefinidas (vendas, compras, pessoal, impostos, etc)
- ✅ Sistema de mapeamento configurável

### 🧾 Módulo Fiscal
- Emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica)
- Importação de XML de NF-e de entrada
- Cupom fiscal para impressão térmica 80mm
- Tributação automática por produto/NCM
- Controle de status e consultas

### 💰 Módulo Financeiro
- Lançamentos financeiros (receitas e despesas)
- Categorias hierárquicas (plano de contas)
- DRE (Demonstrativo de Resultado do Exercício)
- Fluxo de Caixa (previsões e realizações)
- Balancete (totais por categoria)
- Conciliação bancária

### 📦 Módulo de Estoque
- Cadastro de produtos
- Entradas de mercadorias
- Controle de estoque
- Inventário

### 🛒 Módulo de Vendas
- PDV (Ponto de Venda)
- Pedidos e orçamentos
- Integração com NFC-e
- Controle de clientes

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 16+
- MySQL 8+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone [url-do-repositorio]

# Entre na pasta
cd nexus-gestao-backend

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Execute migrations
npm run migrate

# Inicie o servidor
npm start
```

### Configuração Inicial

1. **Configurações Fiscais**
   - Acessar: Admin → Configurações Fiscais
   - Preencher dados da empresa (CNPJ, IE, endereço)
   - Configurar certificado A1 (se necessário)

2. **Categorias Financeiras**
   - Acessar: Admin → Categorias Financeiras
   - Criar categorias de receita e despesa

3. **Mapeamento de Operações** ⭐ IMPORTANTE
   - Acessar: Admin → Mapeamento de Operações
   - Clicar "Inicializar Padrões" (cria 83 operações)
   - Mapear operações essenciais:
     - VENDA_NFCE → Categoria de receita
     - COMPRA_NFE → Categoria de despesa/custo
     - COMPRA_MERCADORIA → Categoria de despesa/custo

---

## 📚 Documentação

### 📖 Documentação Completa
Consulte o **[ÍNDICE GERAL](INDICE-GERAL-DOCUMENTACAO.md)** para acessar toda a documentação organizada.

### 🎯 Principais Documentos

#### Para Usuários
- **[RESUMO-EXECUTIVO-INTEGRACAO.md](RESUMO-EXECUTIVO-INTEGRACAO.md)** - Visão geral do sistema
- **[GUIA-TESTE-INTEGRACAO-FISCAL-FINANCEIRO.md](GUIA-TESTE-INTEGRACAO-FISCAL-FINANCEIRO.md)** - Como testar o sistema

#### Para Desenvolvedores
- **[INTEGRACAO-FISCAL-FINANCEIRO.md](INTEGRACAO-FISCAL-FINANCEIRO.md)** - Documentação técnica completa
- **[EXEMPLOS-RECEITAS.md](EXEMPLOS-RECEITAS.md)** - Exemplos práticos de uso

#### Módulos Específicos
- **[NFCE-DOCUMENTATION.md](NFCE-DOCUMENTATION.md)** - Sistema de NFC-e
- **[LANCAMENTOS-FINANCEIROS-README.md](LANCAMENTOS-FINANCEIROS-README.md)** - Lançamentos financeiros
- **[MAPEAMENTO-OPERACOES-README.md](MAPEAMENTO-OPERACOES-README.md)** - Configuração de operações

---

## 🏗️ Arquitetura

### Backend
```
nexus-gestao-backend/
├── controllers/          # Lógica de negócio
│   ├── NFCeController.js
│   ├── NFCeEntradaController.js
│   ├── LancamentosFinanceirosController.js
│   ├── ConfiguracoesFinanceirasController.js
│   └── ...
├── utils/               # Helpers e utilitários
│   ├── lancamentosHelper.js  ⭐ Lançamentos automáticos
│   ├── cupomFiscal.js
│   └── ...
├── routes/              # Rotas da API
├── middlewares/         # Autenticação, validações
├── migrations/          # Migrações do banco
├── public/              # Interfaces web
│   ├── nfce.html
│   ├── lancamentos-financeiros.html
│   ├── configuracoes-operacoes.html
│   └── ...
└── docs/                # Documentação
```

### Banco de Dados
```
Principais tabelas:
- lancamentos_financeiros          # Lançamentos (receitas/despesas)
- categorias_financeiras           # Plano de contas
- configuracoes_operacoes_financeiras  # Mapeamento operação→categoria
- nfce                            # NFC-es emitidas
- nfe_entrada                     # NF-es de entrada
- produtos                        # Catálogo de produtos
- vendas / itens_venda            # Vendas
- entradas_mercadorias            # Entradas de estoque
```

---

## 🔄 Fluxo de Integração Fiscal-Financeiro

```
┌─────────────────────┐
│  Operação Fiscal    │
│  (NFC-e / NF-e)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ lancamentosHelper   │
│ busca configuração  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Categoria Mapeada  │
│  (usuário define)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Lançamento Criado   │
│  Automaticamente    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Aparece em:       │
│ • Lançamentos       │
│ • DRE               │
│ • Fluxo de Caixa    │
│ • Balancete         │
└─────────────────────┘
```

---

## 🎓 Como Usar

### Emitir NFC-e
```
1. Criar venda no PDV
2. Gerar NFC-e
3. ✨ Sistema cria lançamento financeiro automaticamente
4. Verificar em: Financeiro → Lançamentos Financeiros
```

### Importar NF-e de Entrada
```
1. Obter XML do fornecedor
2. Importar XML via interface
3. ✨ Sistema cria lançamento financeiro automaticamente
4. Verificar despesa criada
```

### Lançamento Manual
```
1. Acessar: Financeiro → Lançamentos Financeiros
2. Clicar "Novo Lançamento"
3. Preencher dados (tipo, categoria, valor, vencimento)
4. Salvar
```

---

## 🧪 Testes

### Testar Integração Fiscal-Financeiro
```bash
# 1. Iniciar servidor
npm start

# 2. Seguir guia de testes
Ver: GUIA-TESTE-INTEGRACAO-FISCAL-FINANCEIRO.md

# 3. Verificar logs
Console do servidor mostra:
💰 Criando lançamento financeiro...
✅ Lançamento financeiro criado: ID XXX
```

### Queries para Validação
```sql
-- Ver últimos lançamentos automáticos
SELECT * FROM lancamentos_financeiros
WHERE referencias IS NOT NULL
ORDER BY created_at DESC LIMIT 10;

-- Ver configurações de operações
SELECT * FROM configuracoes_operacoes_financeiras
WHERE categoria_id IS NOT NULL;
```

---

## 🐛 Troubleshooting

### Lançamento não foi criado
1. Verificar se operação está mapeada (Admin → Mapeamento de Operações)
2. Verificar se categoria existe (Admin → Categorias Financeiras)
3. Consultar logs do servidor (console)
4. Ver documentação: `RESUMO-INTEGRACAO-FISCAL-FINANCEIRO.md`

### Erro ao importar NF-e
1. Verificar se XML é válido
2. Verificar se fornecedor está cadastrado
3. Ver logs detalhados no console

### Relatórios não mostram dados
1. Verificar filtros de data
2. Verificar se há lançamentos no período
3. Recarregar página (F5)

---

## 🔧 Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** MySQL 8
- **Frontend:** HTML5 + JavaScript (Vanilla)
- **Autenticação:** JWT
- **XML:** xml2js para parsing de NF-e
- **Fiscal:** Geração de chave de acesso, QR Code

---

## 📈 Roadmap

### Implementado ✅
- [x] Sistema de NFC-e completo
- [x] Importação de NF-e de entrada
- [x] Lançamentos financeiros manuais
- [x] DRE, Fluxo de Caixa, Balancete
- [x] Integração fiscal-financeiro automática
- [x] 83 operações predefinidas
- [x] Sistema de mapeamento configurável

### Próximas Funcionalidades 📋
- [ ] Contas a Receber (duplicatas)
- [ ] Contas a Pagar (títulos)
- [ ] Lançamento automático de impostos
- [ ] Conciliação bancária automática
- [ ] Centro de custos
- [ ] Provisões automáticas (férias, 13º)

### Futuro 🔮
- [ ] IA para categorização automática
- [ ] Integração bancária (OFX)
- [ ] Dashboard preditivo
- [ ] App mobile
- [ ] API pública

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é propriedade da Nexus Gestão.

---

## 📞 Suporte

- 📧 Email: suporte@nexusgestao.com.br
- 📚 Documentação: Ver arquivos .md na raiz do projeto
- 🐛 Issues: [GitHub Issues](link)

---

## 👥 Equipe

Desenvolvido por **Nexus Gestão Dev Team**

---

## 🎉 Agradecimentos

Agradecemos a todos que contribuíram para este projeto!

---

**Versão:** 2.0  
**Última atualização:** 11/11/2025  
**Status:** ✅ Produção

---

## 🌟 Destaque

### 💰 Integração Fiscal-Financeiro 100% Automática!

**Antes:**
- ❌ Lançamentos manuais
- ❌ Risco de esquecimento
- ❌ Dados inconsistentes
- ❌ ~5 minutos por operação

**Depois:**
- ✅ Lançamentos automáticos
- ✅ 100% das operações fiscais
- ✅ Dados sempre consistentes
- ✅ 0 minutos de trabalho manual

**Economize tempo e elimine erros com nosso sistema integrado!** 🚀
