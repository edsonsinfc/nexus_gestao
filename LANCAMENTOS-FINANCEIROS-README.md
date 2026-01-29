# Sistema de Lançamentos Financeiros - Documentação

## 📋 Resumo da Implementação

Sistema completo para controle de lançamentos financeiros com vínculo a categorias e integração automática com entradas de mercadorias.

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: `lancamentos_financeiros`
Já existente e configurada com os seguintes campos:

- **id**: Identificador único
- **tipo**: RECEITA, DESPESA ou TRANSFERENCIA
- **categoria_id**: Vínculo com `categorias_financeiras`
- **descricao**: Descrição do lançamento
- **valor**: Valor do lançamento
- **data_lancamento**: Data do lançamento
- **data_vencimento**: Data de vencimento (opcional)
- **data_pagamento**: Data do pagamento (opcional)
- **status**: PENDENTE, PAGO ou CANCELADO
- **forma_pagamento**: Forma de pagamento utilizada
- **numero_documento**: Número do documento (cheque, boleto, etc)
- **pessoa_id**: ID do cliente/fornecedor
- **pessoa_tipo**: CLIENTE, FORNECEDOR ou OUTRO
- **observacoes**: Observações adicionais
- **conciliado**: Se foi conciliado ou não
- **usuario_id**: Usuário que criou o lançamento

### Tabela: `entradas_mercadorias`
**Campo adicionado**: `categoria_id` (INT UNSIGNED)
- Vincula a entrada de mercadoria a uma categoria financeira
- Ao finalizar a entrada, cria automaticamente um lançamento de despesa

---

## 🔌 API Endpoints

### Lançamentos Financeiros

#### GET `/api/lancamentos-financeiros`
Lista lançamentos com filtros opcionais:
- `tipo`: RECEITA, DESPESA, TRANSFERENCIA
- `categoria_id`: ID da categoria
- `status`: PENDENTE, PAGO, CANCELADO
- `data_inicio`: Data inicial
- `data_fim`: Data final
- `pessoa_id`: ID da pessoa vinculada
- `conciliado`: true/false

**Resposta:**
```json
{
  "lancamentos": [...],
  "totais": {
    "receitas": 10000.00,
    "despesas": 5000.00,
    "saldo": 5000.00
  }
}
```

#### GET `/api/lancamentos-financeiros/:id`
Busca um lançamento específico

#### POST `/api/lancamentos-financeiros`
Cria novo lançamento

**Body:**
```json
{
  "tipo": "DESPESA",
  "categoria_id": 15,
  "descricao": "Pagamento de energia elétrica",
  "valor": 350.00,
  "data_lancamento": "2025-11-11",
  "data_vencimento": "2025-11-15",
  "status": "PENDENTE",
  "forma_pagamento": "BOLETO",
  "observacoes": "Referente ao mês de outubro"
}
```

#### PUT `/api/lancamentos-financeiros/:id`
Atualiza lançamento existente

#### DELETE `/api/lancamentos-financeiros/:id`
Exclui lançamento (apenas se não estiver conciliado)

#### PATCH `/api/lancamentos-financeiros/:id/pagar`
Marca lançamento como pago

**Body:**
```json
{
  "data_pagamento": "2025-11-11",
  "forma_pagamento": "PIX"
}
```

#### PATCH `/api/lancamentos-financeiros/:id/cancelar`
Cancela lançamento

**Body:**
```json
{
  "motivo": "Duplicado"
}
```

---

## 🖥️ Interface Web

### Tela: `lancamentos-financeiros.html`

Acesso: **Admin → Lançamentos Financeiros**

#### Funcionalidades:

1. **Filtros Inteligentes**
   - Tipo (Receita/Despesa/Transferência)
   - Status (Pendente/Pago/Cancelado)
   - Período (Data Início e Fim)

2. **Cards de Resumo**
   - Total de Receitas (verde)
   - Total de Despesas (vermelho)
   - Saldo (azul)

3. **Tabela de Lançamentos**
   - Data do lançamento
   - Tipo com badge colorido
   - Categoria vinculada
   - Descrição
   - Valor formatado
   - Status com badge
   - Data de vencimento
   - Ações (Editar, Pagar, Excluir)

4. **Modal de Cadastro/Edição**
   - Tipo de lançamento
   - Categoria (dropdown com todas as categorias)
   - Descrição
   - Valor
   - Data de lançamento
   - Data de vencimento
   - Data de pagamento
   - Status
   - Forma de pagamento (11 opções)
   - Número do documento
   - Observações

5. **Ações Rápidas**
   - ✓ Marcar como pago (apenas para pendentes)
   - ✏️ Editar
   - 🗑️ Excluir (apenas não conciliados)

---

## 🔄 Integração com Entradas de Mercadorias

### Como funciona:

1. **Campo adicionado** na tabela `entradas_mercadorias`:
   - `categoria_id` - Seleciona a categoria da despesa

2. **Ao finalizar entrada de mercadoria**:
   - Sistema verifica se há `categoria_id` definida
   - Cria automaticamente lançamento financeiro:
     - **Tipo**: DESPESA
     - **Categoria**: A selecionada na entrada
     - **Descrição**: "Entrada de Mercadorias ENT000001 - Nome do Fornecedor"
     - **Valor**: Valor total da entrada
     - **Data Lançamento**: Data da entrada
     - **Data Vencimento**: Data da entrada + 30 dias
     - **Status**: PENDENTE
     - **Pessoa**: Fornecedor da entrada
     - **Observações**: "Gerado automaticamente pela entrada ENT000001"

3. **Fluxo completo**:
   ```
   Entrada de Mercadorias → Finalizar → 
   ✓ Atualiza estoque
   ✓ Cria lançamento financeiro automático
   ✓ Vínculo com fornecedor
   ✓ Gera conta a pagar
   ```

---

## 💡 Casos de Uso

### Exemplo 1: Pagamento de Energia
```
1. Acessar "Lançamentos Financeiros"
2. Clicar em "Novo Lançamento"
3. Preencher:
   - Tipo: DESPESA
   - Categoria: Água, Luz e Telefone
   - Descrição: Conta de energia elétrica - Outubro/2025
   - Valor: 450.00
   - Data Lançamento: 11/11/2025
   - Data Vencimento: 15/11/2025
   - Forma Pagamento: BOLETO
4. Salvar
```

### Exemplo 2: Pagamento de Salários
```
1. Novo Lançamento
2. Preencher:
   - Tipo: DESPESA
   - Categoria: Salários
   - Descrição: Folha de pagamento - Novembro/2025
   - Valor: 15000.00
   - Data Lançamento: 05/12/2025
   - Data Pagamento: 05/12/2025
   - Status: PAGO
   - Forma Pagamento: TRANSFERENCIA
3. Salvar
```

### Exemplo 3: Entrada de Nota Fiscal
```
1. Criar entrada de mercadorias
2. Selecionar categoria: "Compra de Mercadorias"
3. Adicionar itens
4. Finalizar entrada
5. Sistema cria automaticamente:
   ✓ Lançamento de despesa
   ✓ Valor total da entrada
   ✓ Vencimento 30 dias
   ✓ Status pendente
```

---

## 📊 Integração com Relatórios

Os lançamentos financeiros alimentam:

- **DRE** - Demonstração do Resultado do Exercício
- **Balancete** - Por categoria
- **Fluxo de Caixa** - Entradas e saídas
- **Conciliação Bancária** - Quando pagos

---

## ⚙️ Regras de Negócio

1. **Não pode excluir** lançamento conciliado
2. **Não pode editar** valor/data de lançamento conciliado
3. **Marcar como pago** registra automaticamente data de pagamento
4. **Cancelar** adiciona motivo nas observações
5. **Entrada de mercadorias** só gera lançamento se categoria definida
6. **Categoria é opcional** no lançamento manual
7. **Todos os lançamentos** são vinculados ao usuário criador

---

## 🔐 Segurança

- ✅ Todas as rotas protegidas com autenticação JWT
- ✅ Validação de dados obrigatórios
- ✅ Prevenção de duplicação de códigos
- ✅ Controle de permissões por usuário
- ✅ Auditoria de criação/modificação

---

## 📝 Próximas Melhorias Sugeridas

1. **Parcelamento** - Dividir lançamento em parcelas
2. **Recorrência** - Lançamentos mensais automáticos
3. **Anexos** - Upload de comprovantes
4. **Conciliação** - Match automático com extrato bancário
5. **Centro de Custos** - Classificação adicional
6. **Relatório de Fluxo** - Projeção futura
7. **Dashboard** - Gráficos e indicadores
8. **Importação** - CSV/Excel
9. **Exportação** - PDF/Excel
10. **Notificações** - Alertas de vencimento

---

## 🚀 Status Atual

✅ **100% Implementado e Funcional**

- Tabela de lançamentos configurada
- API completa com CRUD
- Interface web moderna e responsiva
- Integração com entradas de mercadorias
- Vínculo com categorias financeiras
- Filtros e buscas avançadas
- Totalizadores automáticos
- Badges coloridos por status/tipo

**Pronto para uso em produção!**
