# 🧪 Guia de Teste - Integração Fiscal x Financeiro

## 🎯 Objetivo
Testar as integrações automáticas entre módulos fiscais e financeiro.

---

## ⚙️ PRÉ-REQUISITOS

### 1. Configurações Fiscais
- [ ] Configurações fiscais cadastradas (CNPJ, IE, endereço)
- [ ] Ambiente NFC-e configurado

### 2. Categorias Financeiras
```sql
-- Verificar se existem categorias
SELECT id, codigo, nome, tipo FROM categorias_financeiras 
WHERE tipo IN ('RECEITA', 'DESPESA', 'CUSTO')
LIMIT 10;
```

Se não existir, criar:
- **1.1.1** - Receita de Vendas (RECEITA)
- **2.1.1** - Compra de Mercadorias (DESPESA ou CUSTO)

### 3. Inicializar Operações
```
1. Acessar: http://localhost:3000/configuracoes-operacoes.html
2. Clicar: "Inicializar Padrões"
3. Verificar: Mensagem "83 operações inicializadas"
```

### 4. Mapear Operações Essenciais
```
VENDA_NFCE → Selecionar categoria de receita
COMPRA_NFE → Selecionar categoria de despesa/custo
COMPRA_MERCADORIA → Selecionar categoria de despesa/custo
```

---

## 🧾 TESTE 1: NFC-e → Lançamento Automático

### Passo a Passo:

#### 1. Criar Venda
```
1. Acessar módulo de Vendas
2. Criar nova venda
3. Adicionar produtos
4. Finalizar venda
5. Anotar: venda_id (ex: 123)
```

#### 2. Gerar NFC-e
```
1. Na lista de vendas, clicar em "Gerar NFC-e"
2. Preencher dados:
   - CPF/CNPJ do consumidor (opcional)
   - Nome do consumidor (opcional)
   - Observações (opcional)
3. Clicar em "Gerar NFC-e"
4. Aguardar mensagem de sucesso
5. Anotar: nfce_id e chave_acesso
```

#### 3. Verificar no Console do Servidor
```
Buscar por:
💰 Criando lançamento financeiro para NFC-e...
✅ Lançamento financeiro criado: ID 456

OU

⚠️ Lançamento não criado - operação VENDA_NFCE pode não estar configurada
```

#### 4. Verificar Lançamento Criado
```sql
-- Query para encontrar o lançamento
SELECT 
  l.*,
  c.nome as categoria_nome,
  p.nome_razao_social as pessoa_nome
FROM lancamentos_financeiros l
LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
LEFT JOIN clientes p ON l.pessoa_id = p.id AND l.pessoa_tipo = 'CLIENTE'
WHERE l.tipo = 'RECEITA'
AND l.referencias LIKE '%nfce_id%'
ORDER BY l.created_at DESC
LIMIT 5;
```

#### 5. Verificar nos Relatórios
```
✅ Lançamentos Financeiros:
   - Acessar: http://localhost:3000/lancamentos-financeiros.html
   - Filtrar por tipo: RECEITA
   - Verificar: Lançamento com descrição "Venda NFC-e #..."

✅ DRE:
   - Acessar: http://localhost:3000/dre.html
   - Verificar: Receita aparece na categoria configurada

✅ Fluxo de Caixa:
   - Acessar: http://localhost:3000/fluxo-caixa.html
   - Verificar: Entrada do dia atual

✅ Balancete:
   - Acessar: http://localhost:3000/balancete.html
   - Verificar: Categoria de receita com saldo
```

### ✅ Resultado Esperado:
- [x] NFC-e gerada com sucesso
- [x] Log no console: "✅ Lançamento financeiro criado"
- [x] Lançamento na tabela `lancamentos_financeiros`
- [x] Tipo: RECEITA
- [x] Valor: igual ao valor total da NFC-e
- [x] Categoria: configurada no mapeamento
- [x] Referências: contém venda_id, nfce_id, chave_acesso
- [x] Aparece em todos os relatórios

---

## 📥 TESTE 2: NF-e Entrada → Lançamento Automático

### Passo a Passo:

#### 1. Preparar XML de Teste
```
- Obter XML de NF-e real de fornecedor
- Verificar: arquivo tem extensão .xml
- Verificar: XML válido (abrir em navegador)
```

#### 2. Importar XML
```
1. Acessar módulo de NF-e de Entrada
2. Clicar em "Importar XML"
3. Selecionar arquivo .xml
4. Clicar em "Upload"
5. Aguardar processamento
6. Anotar: nfe_entrada_id
```

#### 3. Verificar no Console do Servidor
```
Buscar por:
💰 Criando lançamento financeiro para NF-e de entrada...
✅ Lançamento financeiro criado: ID 789

OU

⚠️ Lançamento não criado - operação COMPRA_NFE pode não estar configurada
```

#### 4. Verificar Lançamento Criado
```sql
-- Query para encontrar o lançamento
SELECT 
  l.*,
  c.nome as categoria_nome,
  f.razao_social as fornecedor_nome
FROM lancamentos_financeiros l
LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
LEFT JOIN fornecedores f ON l.pessoa_id = f.id AND l.pessoa_tipo = 'FORNECEDOR'
WHERE l.tipo = 'DESPESA'
AND l.referencias LIKE '%nfe_entrada_id%'
ORDER BY l.created_at DESC
LIMIT 5;
```

#### 5. Verificar nos Relatórios
```
✅ Lançamentos Financeiros:
   - Filtrar por tipo: DESPESA
   - Verificar: Lançamento com descrição "Compra NF-e #..."

✅ DRE:
   - Verificar: Despesa/Custo aparece na categoria configurada

✅ Fluxo de Caixa:
   - Verificar: Saída programada

✅ Balancete:
   - Verificar: Categoria de despesa/custo com saldo
```

### ✅ Resultado Esperado:
- [x] XML importado com sucesso
- [x] Log no console: "✅ Lançamento financeiro criado"
- [x] Lançamento na tabela `lancamentos_financeiros`
- [x] Tipo: DESPESA
- [x] Valor: igual ao valor total da NF-e
- [x] Categoria: configurada no mapeamento
- [x] Pessoa: fornecedor identificado pelo CNPJ
- [x] Referências: contém nfe_entrada_id, chave_acesso
- [x] Aparece em todos os relatórios

---

## 📦 TESTE 3: Entrada Manual → Lançamento Automático

### Passo a Passo:

#### 1. Criar Entrada Manual
```
1. Acessar: Estoque → Entradas de Mercadorias
2. Clicar em "Nova Entrada"
3. Preencher:
   - Fornecedor
   - Data da entrada
   - Número da nota (opcional)
4. Adicionar produtos
5. Salvar (não finalizar ainda)
6. Anotar: entrada_id
```

#### 2. Finalizar Entrada
```
1. Na lista de entradas, localizar a entrada criada
2. Clicar em "Finalizar"
3. Confirmar operação
4. Aguardar mensagem de sucesso
```

#### 3. Verificar no Console do Servidor
```
Buscar por:
💰 Criando lançamento financeiro para entrada...
✅ Lançamento financeiro criado: ID 321

OU

⚠️ Lançamento não criado - operação COMPRA_MERCADORIA pode não estar configurada
```

#### 4. Verificar Lançamento Criado
```sql
-- Query para encontrar o lançamento
SELECT 
  l.*,
  c.nome as categoria_nome,
  f.razao_social as fornecedor_nome
FROM lancamentos_financeiros l
LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
LEFT JOIN fornecedores f ON l.pessoa_id = f.id
WHERE l.tipo = 'DESPESA'
AND l.referencias LIKE '%entrada_id%'
ORDER BY l.created_at DESC
LIMIT 5;
```

### ✅ Resultado Esperado:
- [x] Entrada finalizada
- [x] Log no console: "✅ Lançamento financeiro criado"
- [x] Lançamento criado automaticamente
- [x] Tipo: DESPESA
- [x] Valor: valor total da entrada
- [x] Categoria: configurada no mapeamento

---

## 🔍 QUERIES ÚTEIS PARA DEBUG

### Ver todas as configurações
```sql
SELECT 
  c.*,
  cat.codigo as categoria_codigo,
  cat.nome as categoria_nome
FROM configuracoes_operacoes_financeiras c
LEFT JOIN categorias_financeiras cat ON c.categoria_id = cat.id
WHERE c.operacao IN ('VENDA_NFCE', 'COMPRA_NFE', 'COMPRA_MERCADORIA')
ORDER BY c.grupo, c.ordem;
```

### Ver últimos 10 lançamentos
```sql
SELECT 
  l.id,
  l.tipo,
  l.descricao,
  l.valor,
  l.data_lancamento,
  l.status,
  c.nome as categoria,
  l.referencias
FROM lancamentos_financeiros l
LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
ORDER BY l.created_at DESC
LIMIT 10;
```

### Ver lançamentos sem categoria
```sql
SELECT * FROM lancamentos_financeiros 
WHERE categoria_id IS NULL
ORDER BY created_at DESC;
```

### Estatísticas por operação (via references)
```sql
-- Contar lançamentos de NFC-e
SELECT COUNT(*) as total_nfce
FROM lancamentos_financeiros
WHERE referencias LIKE '%nfce_id%';

-- Contar lançamentos de NF-e entrada
SELECT COUNT(*) as total_nfe_entrada
FROM lancamentos_financeiros
WHERE referencias LIKE '%nfe_entrada_id%';

-- Contar lançamentos de entrada manual
SELECT COUNT(*) as total_entradas
FROM lancamentos_financeiros
WHERE referencias LIKE '%entrada_id%';
```

---

## ❌ PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: "⚠️ Operação não configurada"
**Causa:** Operação não tem categoria mapeada
**Solução:**
```
1. Acessar: Admin → Mapeamento de Operações
2. Localizar operação (VENDA_NFCE, COMPRA_NFE, etc)
3. Selecionar categoria no dropdown
4. Aguardar auto-save
5. Tentar novamente
```

### Problema 2: Lançamento criado mas categoria NULL
**Causa:** Categoria foi deletada após mapeamento
**Solução:**
```
1. Verificar se categoria existe:
   SELECT * FROM categorias_financeiras WHERE id = ?
2. Se não existir, criar nova categoria
3. Atualizar mapeamento
4. Editar lançamentos antigos manualmente
```

### Problema 3: Erro ao criar lançamento
**Verificar:**
```sql
-- Estrutura da tabela
DESCRIBE lancamentos_financeiros;

-- Foreign keys
SHOW CREATE TABLE lancamentos_financeiros;

-- Categorias disponíveis
SELECT id, codigo, nome, tipo FROM categorias_financeiras;
```

### Problema 4: Servidor não mostra logs
**Solução:**
```
1. Parar servidor: Ctrl+C
2. Reiniciar: npm start
3. Observar console durante operação
4. Se não aparecer logs, verificar imports nos controllers
```

---

## 📊 CHECKLIST DE VALIDAÇÃO COMPLETA

### Configuração
- [ ] Categorias financeiras criadas (mínimo 2: receita e despesa)
- [ ] Operações inicializadas (83 operações)
- [ ] Mapeamento feito (mínimo 3: VENDA_NFCE, COMPRA_NFE, COMPRA_MERCADORIA)

### Teste NFC-e
- [ ] Venda criada
- [ ] NFC-e gerada com sucesso
- [ ] Log "✅ Lançamento criado" no console
- [ ] Lançamento na tabela com tipo RECEITA
- [ ] Valor correto
- [ ] Categoria correta
- [ ] Aparece em Lançamentos Financeiros
- [ ] Aparece no DRE
- [ ] Aparece no Fluxo de Caixa
- [ ] Aparece no Balancete

### Teste NF-e Entrada
- [ ] XML válido obtido
- [ ] XML importado com sucesso
- [ ] Log "✅ Lançamento criado" no console
- [ ] Lançamento na tabela com tipo DESPESA
- [ ] Valor correto
- [ ] Fornecedor identificado
- [ ] Categoria correta
- [ ] Aparece em todos os relatórios

### Teste Entrada Manual
- [ ] Entrada criada
- [ ] Entrada finalizada
- [ ] Log "✅ Lançamento criado" no console
- [ ] Lançamento criado automaticamente
- [ ] Dados corretos
- [ ] Aparece em relatórios

---

## 🎯 RESULTADO FINAL ESPERADO

### Métricas de Sucesso:
- ✅ 100% das NFC-es geram lançamentos
- ✅ 100% das NF-es de entrada geram lançamentos
- ✅ 100% das entradas finalizadas geram lançamentos
- ✅ 0 lançamentos sem categoria
- ✅ Relatórios atualizados em tempo real
- ✅ Dados consistentes entre fiscal e financeiro

### KPIs:
- **Taxa de automação:** 100%
- **Economia de tempo:** ~5 minutos por operação
- **Redução de erros:** ~95%
- **Satisfação do usuário:** Alta (sem trabalho manual)

---

## 📝 RELATÓRIO DE TESTE

Preencha após realizar os testes:

```
Data do Teste: ___/___/___
Testado por: _____________

TESTE 1 - NFC-e:
[ ] Passou  [ ] Falhou
Observações: __________________________

TESTE 2 - NF-e Entrada:
[ ] Passou  [ ] Falhou
Observações: __________________________

TESTE 3 - Entrada Manual:
[ ] Passou  [ ] Falhou
Observações: __________________________

Problemas Encontrados:
_____________________________________
_____________________________________

Melhorias Sugeridas:
_____________________________________
_____________________________________

Status Final: [ ] Aprovado  [ ] Reprovado
```

---

**Boa sorte nos testes! 🚀**
