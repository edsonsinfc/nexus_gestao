# 🧾 Sistema de NFC-e - Nexus Gestão

## Visão Geral

O sistema de NFC-e (Nota Fiscal de Consumidor Eletrônica) foi implementado para gerar automaticamente cupons fiscais eletrônicos no momento da finalização de vendas no PDV, conforme exigências fiscais do Distrito Federal.

---

## 💰 INTEGRAÇÃO FINANCEIRA AUTOMÁTICA (NOVO!)

### 📊 Lançamentos Automáticos ao Emitir NFC-e

Quando uma NFC-e é gerada, o sistema **automaticamente cria um lançamento financeiro** na tabela `lancamentos_financeiros`:

#### Operação: `VENDA_NFCE`
- **Tipo:** RECEITA
- **Descrição:** Venda NFC-e #[número] - [nome do consumidor]
- **Valor:** Valor total da nota
- **Data:** Data de emissão
- **Vinculação:** venda_id, nfce_id, chave_acesso
- **Categoria:** Definida pelo usuário no Mapeamento de Operações

#### ✅ Como funciona:
1. Usuário gera NFC-e a partir de uma venda
2. Sistema insere dados na tabela `nfce`
3. Sistema busca configuração da operação `VENDA_NFCE`
4. Sistema cria lançamento financeiro com categoria configurada
5. Lançamento aparece automaticamente em:
   - 💵 Lançamentos Financeiros
   - 📈 DRE (Demonstrativo de Resultado)
   - 💸 Fluxo de Caixa
   - 📊 Balancete

#### ⚙️ Configuração necessária:
1. Acessar **Admin → Mapeamento de Operações**
2. Clicar em **"Inicializar Padrões"** (se ainda não fez)
3. Localizar operação **VENDA_NFCE** no grupo **VENDAS**
4. Selecionar categoria apropriada (ex: "1.1.1 - Receita de Vendas")
5. **Pronto!** Todas as NFC-es geradas criarão lançamentos automaticamente

#### 🔧 Detalhes técnicos:
```javascript
// Código executado após gerar NFC-e
await criarLancamentoAutomatico({
  operacao: 'VENDA_NFCE',
  descricao: `Venda NFC-e #${numeroSequencial} - ${consumidor}`,
  valor: valorTotal,
  tipo: 'RECEITA',
  pessoa_id: cliente_id,
  pessoa_tipo: 'CLIENTE',
  referencias: {
    venda_id: venda_id,
    nfce_id: nfceId,
    chave_acesso: chaveAcesso
  }
});
```

---

## 📋 Funcionalidades Implementadas

### ✅ Geração Automática de NFC-e
- **Integração com PDV**: Toda venda finalizada gera automaticamente uma NFC-e
- **Dados fiscais completos**: Inclui todos os campos obrigatórios para o DF
- **Chave de acesso**: Geração automática conforme padrão SEFAZ
- **Status**: Controle de estados (NAO_FISCAL, PENDENTE, AUTORIZADA, CANCELADA, INUTILIZADA)

### ✅ Cupom Fiscal para Impressão
- **Layout otimizado**: Formato padrão para impressoras térmicas 80mm
- **Logo da empresa**: Suporte para inserção de logotipo no cabeçalho
- **Observações**: Campo para observações personalizadas
- **QR Code**: Placeholder para implementação futura
- **Consulta online**: Link para consulta no site da SEFAZ-DF

### ✅ Interface de Gerenciamento
- **Lista de NFC-es**: Visualização de todas as notas geradas
- **Filtros avançados**: Por status, data, número
- **Reimpressão**: Possibilidade de reimprimir cupons
- **Cancelamento**: Cancelamento de NFC-es emitidas
- **Paginação**: Lista paginada para performance

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

#### `nfce`
- **Propósito**: Armazena dados fiscais da NFC-e
- **Relacionamento**: Vinculada à tabela `vendas` existente
- **Campos principais**:
  - `numero_sequencial`: Numeração sequencial da NFC-e
  - `chave_acesso`: Chave de 44 dígitos
  - `cnpj_emitente`, `inscricao_estadual`: Dados da empresa
  - `cpf_cnpj_consumidor`: CPF/CNPJ do cliente (opcional)
  - `observacoes`: Observações personalizadas
  - `status`: NAO_FISCAL | PENDENTE | AUTORIZADA | CANCELADA | INUTILIZADA

#### `nfce_itens_fiscal`
- **Propósito**: Dados fiscais complementares dos itens
- **Relacionamento**: Vinculada à tabela `itens_venda` existente
- **Campos principais**:
  - `ncm`, `cfop`: Classificação fiscal
  - `cst_icms`, `cst_pis`, `cst_cofins`: Situação tributária
  - `origem_produto`: Origem da mercadoria

#### `configuracoes_fiscais`
- **Propósito**: Configurações da empresa emitente
- **Dados**:
  - Razão social, CNPJ, Inscrição Estadual
  - Endereço completo
  - Logo da empresa
  - Observações padrão para o cupom

## 🚀 Como Usar

### 1. Configuração Inicial

Você pode configurar os dados diretamente pelo formulário do sistema (recomendado) ou via comandos/scripts.

Opção A) Pelo formulário (recomendado)
- Acesse: http://localhost:3000/admin.html#sec-config-fiscal (abre direto na seção dentro do Admin) ou http://localhost:3000/config-fiscal.html 
- Também disponível via menu Admin → “Config. Fiscais (NFC-e)”
- Preencha: razão social, CNPJ, IE, endereço, ambiente, série e numeração
- Envie o logo (PNG/JPG)
- Envie o Certificado A1 (.pfx) e informe a senha
- Se já possuir, informe também o CSC (id e token)

Opção B) Via SQL (alternativa avançada)
Primeiro, configure os dados da sua empresa:

```sql
UPDATE configuracoes_fiscais SET
    cnpj = '12.345.678/0001-00',
    inscricao_estadual = '12345678901',
    razao_social = 'SUA EMPRESA LTDA',
    nome_fantasia = 'Sua Empresa',
    logradouro = 'SUA RUA',
    numero = '123',
    bairro = 'SEU BAIRRO',
    municipio = 'BRASILIA',
    uf = 'DF',
    cep = '70000-000',
    codigo_municipio = '5300108'
WHERE id = 1;
```

Para enviar o logotipo da empresa (aparece no cabeçalho do cupom) via script (alternativa ao formulário):

```powershell
# Salve sua imagem em um caminho local e rode:
node .\scripts\upload_logo_fiscal.js "c:\\caminho\\para\\logo.png"
```

Recomendações de imagem: formato PNG/JPG, fundo branco ou transparente, largura até ~60mm (para 80mm a resolução típica é 360–480px de largura).

### 2. Uso no PDV

Agora, ao finalizar a venda, o PDV pergunta se você deseja emitir:
- Venda Fiscal (SEFAZ): requer Certificado A1 e CSC; envia/autoriza na SEFAZ (em desenvolvimento neste ambiente)
- Venda Não Fiscal: gera o cupom local (sem transmissão), útil para contingência/controle interno

#### Definições: Fiscal x Não Fiscal
- Venda Não Fiscal
  - Gera o cupom local (DANFE NFC-e simulado) apenas para impressão e controle interno.
  - Status gravado: `NAO_FISCAL`.
  - Nenhuma transmissão é feita para a SEFAZ e não há protocolo de autorização.
  - Útil para operação sem certificado, testes, contingência e orçamentos.

- Venda Fiscal (SEFAZ)
  - Gera o XML oficial da NFC-e, assina com o Certificado A1 e transmite para o WebService da SEFAZ-DF.
  - Exige: Certificado A1 (arquivo .pfx e senha) + CSC (idToken e CSC) + configuração de ambiente (HOMOLOGAÇÃO/PRODUÇÃO).
  - Status esperado após sucesso: `AUTORIZADA` (com protocolo). Em caso de falha: `PENDENTE` ou rejeitada com motivo.
  - Cancelamento usa evento SEFAZ e muda para `CANCELADA`.

**Manual**: Use as funções JavaScript disponíveis:
```javascript
// Gerar NFC-e para uma venda específica
await gerarNFCe(vendaId, observacoes);

// Imprimir cupom
await imprimirCupomNFCe(nfceId);

// Cancelar NFC-e
await cancelarNFCe(nfceId, motivo);

// Autorizar NFC-e (fiscal) – requer integração/credenciais
await autorizarNFCe(vendaId, observacoes);
```

### 2.1 Integração Bancária (PIX)

Para integração direta com o banco (cobranças PIX dinâmicas e confirmação automática), configure no Admin → Configurações → seção "Configurações Fiscais (NFC-e)" o bloco "Integração Bancária (PIX)":

- Provedor/Instituição (ex.: seu banco, Efi/Gerencianet, etc.)
- Ambiente PIX: Homologação ou Produção
- Base URL da API do provedor
- Client ID e Client Secret (OAuth, quando aplicável)
- Webhook URL e Token/Secreto (para confirmação assíncrona)
- ISPB do banco, Agência, Conta e Tipo de Conta (CC/CP)
- Chave PIX (CNPJ, e-mail, telefone ou aleatória)

Observação: o backend atual possui fluxo PIX simulado. Após informar os dados acima, a próxima etapa é conectar ao provedor real (autenticação OAuth/mTLS, criação de cobranças e webhook de confirmação).

#### 2.1.1 Provedores suportados (escopo inicial)

- SIMULADO: já disponível (gera QR base64 e permite confirmação manual ou por polling)
- SICOOB: implementado (scaffolding real). Requer:
  - Autenticação OAuth2 e mTLS (certificado cliente)
  - Certificado PFX/P12 e/ou par PEM (configure os campos em Admin → Integração PIX → Certificados/TLS)
  - Base URL, Client ID/Secret e demais credenciais fornecidas pelo Sicoob
- BANCO DO BRASIL: implementado (scaffolding real). Requer:
  - Autenticação OAuth2 e mTLS
  - Certificado PFX/P12 e/ou PEM (configure em Certificados/TLS)
  - Base URL, Client ID/Secret e cadastro no portal de desenvolvedores BB

Notas importantes:
- Os conectores Sicoob e BB utilizam uma convenção de endpoints compatível com o padrão BACEN: `/pix/cob` (criar), `/pix/cob/{txid}` (consultar/patch cancelar). Dependendo do ambiente do banco, os caminhos podem variar; ajuste `pix_base_url` conforme a documentação do seu PSP.
- O token OAuth é obtido em `pix_base_url + /oauth/token` usando grant type `client_credentials` e Basic Auth de `client_id:client_secret`. Alguns bancos podem exigir caminhos/escopos diferentes; ajuste a `pix_base_url` e credenciais conforme necessário.

Campos extras para mTLS adicionados na configuração:
- pix_cert_pfx_path, pix_cert_pfx_password
- pix_cert_cert_path, pix_cert_key_path (opcionais, formato PEM)
- pix_cert_ca_path (cadeia de certificação, opcional)

Webhook: informe a URL pública do seu sistema (ex.: https://sua-loja.com/api/pagamentos/pix/webhook) e um token/segredo para validação de notificações. Em homologação é possível habilitar bypass (sem token) via variável de ambiente `PIX_WEBHOOK_ALLOW_NO_TOKEN=true` — desabilite em produção.

Futuro próximo:
- Assinar/verificar webhooks quando o banco fornecer assinatura/HMAC nos headers
- Ajustes finos por banco (escopos OAuth, caminhos específicos, payloads adicionais)

Colocando em produção (checklist rápido):
- Admin → Integração PIX: selecione seu provedor (Sicoob/BB) e “Ambiente PIX: Produção”.
- Configure `pix_base_url`, `pix_client_id`, `pix_client_secret`, `pix_chave`.
- Em Certificados/TLS: informe o caminho do PFX/P12 (ou PEM cert/key/ca) no servidor e a senha.
- Configure o Webhook URL público e defina um token forte. Desabilite o bypass (`PIX_WEBHOOK_ALLOW_NO_TOKEN=false`).
- Teste: criar cobrança, pagar via app bancário, confirmar recebimento pelo webhook (status muda para CONFIRMADO).

### 2.2 Cartões (Adquirentes)

Adquirentes mencionadas: Rede, Cielo, Stone e Sicredi.

Abordagens de integração recomendadas:
- POS/SmartPOS do próprio adquirente (SDK/hardware)
- TEF (SiTef/PayGo/M-SiTef) com integração local
- E-commerce API (quando aplicável)

Escopo atual: ainda não implementado. O PDV já está preparado para orquestrar o fluxo de pagamento antes de finalizar a venda. Recomendação: definir a estratégia (POS/TEF/API) por adquirente e, a partir disso, habilitar os módulos correspondentes no Admin para capturar credenciais (merchantId/keys) e realizar a autorização/captura. Enquanto isso, o PIX cobre pagamentos imediatos.
### 3. Gerenciamento de NFC-es

Acesse: `http://localhost:3000/nfce.html`

**Funcionalidades disponíveis**:
- 📋 Listar todas as NFC-es
- 🔍 Filtrar por status, data, número
- 🖨️ Reimprimir cupons
- 👁️ Visualizar detalhes
- ❌ Cancelar NFC-es

## 🔌 API Endpoints

### `POST /api/nfce/gerar`
Gera nova NFC-e para uma venda

**Body**:
```json
{
  "venda_id": 123,
  "observacoes": "Observações opcionais",
  "cpf_cnpj_consumidor": "12345678901",
  "nome_consumidor": "Nome do Cliente"
}
```

### `GET /api/nfce`
Lista NFC-es com filtros opcionais

**Query params**:
- `page`: Página (padrão: 1)
- `limit`: Limite por página (padrão: 20)
- `status`: NAO_FISCAL | PENDENTE | AUTORIZADA | CANCELADA | INUTILIZADA
- `data_inicio`: YYYY-MM-DD
- `data_fim`: YYYY-MM-DD

### `GET /api/nfce/:id`
Busca NFC-e específica com itens

### `GET /api/nfce/:id/cupom`
Gera HTML e texto do cupom para impressão

### `POST /api/nfce/:id/cancelar`
Cancela uma NFC-e emitida

**Body**:
```json
{
  "motivo": "Motivo do cancelamento"
}
```

## 🖨️ Impressão de Cupons

### Formato HTML
- **Uso**: Visualização em tela e impressão
- **Características**:
  - Layout responsivo
  - Suporte a logos
  - Estilos para impressão
  - Botões de ação

### Formato Texto
- **Uso**: Impressoras térmicas não fiscais
- **Características**:
  - 48 caracteres por linha
  - Formatação ASCII
  - Quebra automática de texto
  - Compatível com ESC/POS

## 📝 Observações Importantes

### Conformidade Fiscal - DF
✅ **Dados obrigatórios implementados**:
- CNPJ e IE do emitente
- Endereço completo
- Chave de acesso de 44 dígitos
- Numeração sequencial
- Data e hora de emissão

### Regime Tributário
- **Configurado para**: Simples Nacional
- **CST padrão**: 102 (ICMS), 49 (PIS/COFINS)
- **Alíquotas**: Zeradas (conforme Simples Nacional)

### Estrutura de impostos utilizada no sistema
- Objeto retornado por `calcularImpostos(itens, venda)`:
  - `baseCalculoIcms`: número (padrão: 0)
  - `valorIcms`: número (padrão: 0)
  - `valorPis`: número (padrão: 0)
  - `valorCofins`: número (padrão: 0)
  - `valorTotalNota`: número (usa `venda.valor_total`)

- Observação: a partir do módulo de Tributação, os campos fiscais por item podem ser preenchidos automaticamente a partir das "Figuras Tributárias de Saída" conforme as seguintes prioridades:
  1) Vínculo direto do Produto → Figura de Saída
  2) Mapeamento por NCM (padrões com coringa como `84*`, `8471*` ou NCM completo)
  3) Fallback para defaults abaixo, quando nenhuma figura é encontrada

  Defaults compatíveis com DF e Simples Nacional (fallback):
  - `ncm`: '00000000'
  - `cfop`: '5102'
  - `origem_produto`: 0 (Nacional)
  - `unidade`: 'UN'
  - `cst_icms`: '102', `aliquota_icms`: 0
  - `cst_pis`: '49', `aliquota_pis`: 0
  - `cst_cofins`: '49', `aliquota_cofins`: 0

### Limitações Atuais
❌ **Não implementado**:
- Transmissão para SEFAZ (ambiente offline)
- Geração de QR Code real
- Consulta de status na SEFAZ
- Contingência offline

## 🔧 Manutenção

### Backup das NFC-es
```sql
-- Backup das NFC-es
SELECT * FROM nfce WHERE created_at >= '2024-01-01';

-- Backup dos itens fiscais
SELECT * FROM nfce_itens_fiscal 
WHERE nfce_id IN (SELECT id FROM nfce WHERE created_at >= '2024-01-01');
```

### Limpeza de Dados Antigos
```sql
-- Remover NFC-es canceladas antigas (mais de 1 ano)
DELETE FROM nfce 
WHERE status = 'CANCELADA' 
AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

### Resequenciar Numeração
```sql
-- Obter próximo número disponível
SELECT COALESCE(MAX(numero_sequencial), 0) + 1 as proximo_numero 
FROM nfce WHERE serie = 1;
```

## 🆘 Solução de Problemas

### Erro: "Configurações fiscais não encontradas"
**Solução**: Execute a configuração inicial dos dados da empresa

### Erro: "Venda não encontrada"
**Solução**: Verifique se o ID da venda existe na tabela `vendas`

### Cupom não imprime
**Solução**: 
1. Verifique se o navegador permite pop-ups
2. Configure a impressora padrão
3. Use Ctrl+P para imprimir manualmente

### NFC-e não cancela
**Solução**: Apenas NFC-es com status "EMITIDA" podem ser canceladas

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte esta documentação
3. Verifique as configurações fiscais
4. Teste com dados de exemplo

---

**Sistema desenvolvido para Nexus Gestão - Material de Construção**  
**Versão**: 1.0  
**Data**: Outubro 2024