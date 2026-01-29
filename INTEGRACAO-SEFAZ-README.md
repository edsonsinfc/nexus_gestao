# 🔐 Integração SEFAZ - NF-e Entrada

## 📋 Funcionalidades Implementadas

### 1. **Consultar Notas Pendentes** 
Busca automática de notas fiscais eletrônicas emitidas contra o CNPJ da empresa.

**Endpoint:** `GET /api/nfe-entrada/sefaz/consultar?ultNSU=0`

```javascript
// Retorno
{
  "sucesso": true,
  "ultNSU": "000000000000123",
  "maxNSU": "000000000000150",
  "totalNotas": 5,
  "notas": [
    {
      "tipo": "NFe",
      "chave": "35210512345678000190550010000001234567890123",
      "nsu": "000000000000124",
      "numero": "123",
      "serie": "1",
      "dataEmissao": "2025-11-27T10:30:00-03:00",
      "cnpjEmitente": "12345678000190",
      "nomeEmitente": "FORNECEDOR LTDA",
      "valorTotal": 1500.00,
      "xmlCompleto": "<?xml version...",
      "situacao": "PENDENTE_MANIFESTACAO"
    }
  ]
}
```

### 2. **Importar Nota para o Sistema**
Salva o XML, cria/atualiza fornecedor e importa nota com todos os itens.

**Endpoint:** `POST /api/nfe-entrada/sefaz/importar`

```javascript
{
  "chaveNFe": "35210512345678000190550010000001234567890123",
  "xmlContent": "<?xml version...",
  "nsu": "000000000000124"
}
```

**Processo:**
1. ✅ Salva XML em `uploads/nfe-entrada/`
2. ✅ Extrai dados do fornecedor
3. ✅ Cria fornecedor se não existir
4. ✅ Insere NF-e na tabela `nfe_entrada`
5. ✅ Insere itens na tabela `nfe_entrada_itens`

### 3. **Manifestação do Destinatário**
Permite dar ciência, confirmar, desconhecer ou recusar a operação.

**Endpoint:** `POST /api/nfe-entrada/sefaz/manifestar`

```javascript
{
  "chaveNFe": "35210512345678000190550010000001234567890123",
  "tipoEvento": "CIENCIA", // CIENCIA, CONFIRMACAO, DESCONHECIMENTO, NAO_REALIZADA
  "justificativa": "Operação confirmada" // Obrigatório para DESCONHECIMENTO e NAO_REALIZADA
}
```

**Tipos de Manifestação:**
- 🔵 **CIENCIA** (210210): Declara que tomou ciência da nota
- ✅ **CONFIRMACAO** (210200): Confirma que a operação ocorreu
- ❓ **DESCONHECIMENTO** (210220): Declara que não conhece o emissor
- ❌ **NAO_REALIZADA** (210240): Declara que a operação não ocorreu

### 4. **Download de XML Completo**
Para notas que vieram apenas como resumo.

**Endpoint:** `GET /api/nfe-entrada/sefaz/download/:chaveNFe`

### 5. **Verificar Certificado Digital**
Testa se o certificado está configurado corretamente.

**Endpoint:** `GET /api/nfe-entrada/sefaz/certificado`

```javascript
{
  "valido": true,
  "mensagem": "Certificado carregado com sucesso"
}
```

## 🔧 Configuração

### 1. Instalar Dependências

```bash
npm install soap axios xml2js
```

### 2. Configurar Certificado Digital

1. **Obter certificado e-CPF ou e-CNPJ tipo A1**
   - Comprar em autoridade certificadora (Serasa, Certisign, etc)
   - Tipo: A1 (arquivo .pfx)
   - Validade: 1 ano

2. **Exportar certificado como .pfx**
   ```
   - Abrir Gerenciador de Certificados (Windows)
   - Localizar certificado instalado
   - Exportar → Incluir chave privada → .pfx
   - Definir senha forte
   ```

3. **Copiar para o projeto**
   ```bash
   mkdir certificados
   # Copiar arquivo.pfx para certificados/
   ```

4. **Configurar .env**
   ```env
   SEFAZ_AMBIENTE=2
   SEFAZ_UF=SP
   EMPRESA_CNPJ=12345678000190
   CERT_PATH=./certificados/certificado.pfx
   CERT_PASSWORD=sua_senha_aqui
   ```

5. **Adicionar ao .gitignore**
   ```
   certificados/
   *.pfx
   *.p12
   ```

### 3. Criar Pasta de Upload

```bash
mkdir -p uploads/nfe-entrada
```

## 🎯 Fluxo de Uso

### Cenário 1: Buscar e Importar Notas

```javascript
// 1. Consultar SEFAZ
const resposta = await fetch('/api/nfe-entrada/sefaz/consultar?ultNSU=0');
const { notas, ultNSU } = await resposta.json();

// 2. Para cada nota, importar
for (const nota of notas) {
  if (nota.xmlCompleto) {
    await fetch('/api/nfe-entrada/sefaz/importar', {
      method: 'POST',
      body: JSON.stringify({
        chaveNFe: nota.chave,
        xmlContent: nota.xmlCompleto,
        nsu: nota.nsu
      })
    });
  }
}

// 3. Salvar último NSU consultado para próxima busca
localStorage.setItem('ultimoNSU', ultNSU);
```

### Cenário 2: Manifestar Ciência

```javascript
// 1. Importar nota
const nfeImportada = await importarNota(chave, xml, nsu);

// 2. Dar ciência imediatamente (obrigatório em 24h)
await fetch('/api/nfe-entrada/sefaz/manifestar', {
  method: 'POST',
  body: JSON.stringify({
    chaveNFe: chave,
    tipoEvento: 'CIENCIA'
  })
});

// 3. Depois de conferir a mercadoria, confirmar
await fetch('/api/nfe-entrada/sefaz/manifestar', {
  method: 'POST',
  body: JSON.stringify({
    chaveNFe: chave,
    tipoEvento: 'CONFIRMACAO'
  })
});
```

## ⚠️ Regras da SEFAZ

1. **Ciência Obrigatória**
   - Deve ser manifestada em até 24h após a emissão
   - Caso contrário, considera-se confirmada automaticamente

2. **Ordem das Manifestações**
   - Primeiro: Ciência (210210)
   - Depois: Confirmação OU Desconhecimento OU Não Realizada
   - Não é possível mudar após confirmar

3. **Justificativa Obrigatória**
   - DESCONHECIMENTO: Mínimo 15 caracteres
   - NAO_REALIZADA: Mínimo 15 caracteres

4. **NSU Sequencial**
   - Sempre consultar a partir do último NSU recebido
   - Guardar `maxNSU` para próximas consultas
   - Limite: 50 documentos por consulta

## 🔄 Automação Sugerida

### Cron Job para Consulta Automática

```javascript
// Executar a cada hora
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  console.log('🔍 Consultando SEFAZ...');
  
  const ultNSU = await obterUltimoNSU();
  const resultado = await sefazService.consultarNotasPendentes(ultNSU);
  
  if (resultado.sucesso && resultado.notas.length > 0) {
    console.log(`📥 ${resultado.notas.length} nota(s) encontrada(s)`);
    
    for (const nota of resultado.notas) {
      // Importar automaticamente
      await importarNota(nota);
      
      // Dar ciência automaticamente
      await manifestarCiencia(nota.chave);
    }
    
    // Salvar último NSU
    await salvarUltimoNSU(resultado.ultNSU);
  }
});
```

## 🐛 Troubleshooting

### Erro: "Certificado não encontrado"
```bash
# Verificar se o arquivo existe
ls certificados/certificado.pfx

# Verificar permissões
chmod 600 certificados/certificado.pfx
```

### Erro: "Senha incorreta"
```bash
# Testar certificado manualmente
openssl pkcs12 -in certificados/certificado.pfx -noout
```

### Erro: "Rejeição 280: Certificado Transmissor inválido"
- Certificado pode estar vencido
- Verificar se é o certificado da empresa (CNPJ correto)
- Verificar se está usando ambiente correto (homologação vs produção)

### Erro: "Timeout na conexão"
- Verificar firewall
- SEFAZ pode estar fora do ar
- Consultar: https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx

## 📚 Referências

- [Manual de Integração Distribuição DFe](http://www.nfe.fazenda.gov.br/portal/principal.aspx)
- [Schemas XSD NF-e 4.0](http://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=9x0Uk9gcD0=)
- [Manifestação do Destinatário](http://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=7xkxdKGMPtY=)

---

✅ **Sistema completo de integração SEFAZ implementado!**
