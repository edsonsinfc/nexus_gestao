# 🔐 Certificados Digitais

## Onde colocar o certificado

Coloque seu certificado digital nesta pasta:
```
certificados/seu-certificado.pfx
```

## Como configurar

1. **Obter o Certificado Digital A1**
   - Tipo: e-CNPJ ou e-CPF A1
   - Formato: `.pfx` (PKCS#12)
   - Validade: geralmente 1 ano

2. **Configurar no .env**

Adicione estas linhas no arquivo `.env` na raiz do projeto:

```env
# SEFAZ - Integração Fiscal
SEFAZ_AMBIENTE=2
SEFAZ_UF=PR
EMPRESA_CNPJ=00000000000000

# Certificado Digital A1
SEFAZ_CERT_PATH=./certificados/seu-certificado.pfx
SEFAZ_CERT_PASSWORD=sua_senha_aqui
```

3. **Ambientes disponíveis**
   - `SEFAZ_AMBIENTE=2` → Homologação (testes)
   - `SEFAZ_AMBIENTE=1` → Produção (uso real)

⚠️ **IMPORTANTE**: Sempre teste em homologação primeiro!

## Obtendo certificado de teste

Para testar o sistema, você pode obter um certificado de homologação:

1. Acesse o site da SEFAZ do seu estado
2. Procure por "Certificado de Homologação" ou "Ambiente de Testes"
3. Alguns estados oferecem certificados gratuitos para testes

## Renovação

Certificados digitais vencem anualmente. Lembre-se de renovar antes do vencimento para não interromper as operações.

## Segurança

⚠️ **NUNCA** compartilhe:
- O arquivo .pfx
- A senha do certificado
- Não faça commit do certificado no git

Esta pasta está no `.gitignore` para proteger seus certificados.
