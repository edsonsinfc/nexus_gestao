# 📸 Guia de Imagens de Produtos - Nexus B2B

## 🎯 Resumo Rápido

Existem **3 formas** de adicionar imagens aos produtos:

---

## ✅ **Método 1: Copiar manualmente (Mais Simples)**

### Passo a passo:

1. **Copie suas imagens** para a pasta:
   ```
   public/images/produtos/
   ```

2. **Renomeie os arquivos** com nomes descritivos:
   ```
   LMP001-detergente.jpg
   HIG001-papel-higienico.png
   LMP002-desinfetante.webp
   ```

3. **No cadastro do produto**, use o caminho:
   ```
   /images/produtos/LMP001-detergente.jpg
   ```

### ✅ Vantagens:
- Simples e rápido
- Não precisa de upload
- Funciona offline

---

## 🚀 **Método 2: Upload via Interface (Recomendado)**

### Como usar:

1. **Acesse o painel Gestor** → Aba "Produtos"

2. **Ao criar/editar um produto**, clique em **"📤 Upload de Imagem"**

3. **Selecione a imagem** do seu computador (máx 5MB)

4. **A URL será preenchida automaticamente** no campo "Foto"

### ✅ Vantagens:
- Interface gráfica
- Validação automática
- Nomes únicos (sem conflitos)

### 📋 Formatos aceitos:
- JPG / JPEG
- PNG
- GIF
- WEBP

### 📏 Limite de tamanho:
- **5MB por imagem**

---

## 🌐 **Método 3: URL Externa**

Use imagens hospedadas na internet:

```
https://exemplo.com/imagens/produto.jpg
https://cdn.minhaloja.com.br/produto123.png
```

### ✅ Vantagens:
- Não ocupa espaço no servidor
- Pode usar CDN

### ⚠️ Desvantagens:
- Depende de internet
- Pode ficar offline se o site cair

---

## 📂 Estrutura de Pastas

```
limpeza-b2b/
  └── public/
      └── images/
          └── produtos/          ← Coloque suas imagens aqui
              ├── LMP001.jpg
              ├── HIG001.png
              ├── detergente.webp
              └── ...
```

---

## 🔧 API de Upload (Para desenvolvedores)

### Upload de imagem:
```bash
POST /api/upload/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

Campo do formulário: "imagem"
```

### Resposta de sucesso:
```json
{
  "success": true,
  "url": "/images/produtos/detergente-1730840000-123456789.jpg",
  "filename": "detergente-1730840000-123456789.jpg",
  "size": 245678,
  "mimetype": "image/jpeg"
}
```

### Deletar imagem:
```bash
DELETE /api/upload/{filename}
Authorization: Bearer {token}
```

---

## 📝 Exemplos Práticos

### Exemplo 1: Cadastrar produto com imagem local
```
Código: LMP001
Descrição: Detergente Neutro 5L
Foto: /images/produtos/detergente-neutro.jpg
```

### Exemplo 2: Cadastrar produto com URL externa
```
Código: HIG001
Descrição: Papel Higiênico
Foto: https://cdn.exemplo.com/papel-higienico.jpg
```

### Exemplo 3: Upload via interface
1. Clique em "📤 Upload de Imagem"
2. Selecione arquivo
3. Campo "Foto" preenchido automaticamente com:
   `/images/produtos/papel-higienico-1730840000-987654321.jpg`

---

## 🎨 Dicas de Qualidade

### Tamanho recomendado:
- **800x800 pixels** (quadrado)
- ou **800x600 pixels** (horizontal)

### Formato recomendado:
- **WebP** (melhor compressão)
- **JPG** (boa compatibilidade)
- **PNG** (com transparência)

### Otimização:
- Use ferramentas como TinyPNG ou Squoosh.app
- Mantenha abaixo de 200KB por imagem
- Evite imagens muito grandes (> 2MB)

---

## ❓ Perguntas Frequentes

**P: Posso usar imagens sem extensão na URL?**
R: Não, sempre inclua a extensão (.jpg, .png, etc.)

**P: A imagem não aparece, o que fazer?**
R: Verifique se:
- O arquivo existe em `public/images/produtos/`
- O caminho está correto (começando com `/images/produtos/`)
- O servidor está rodando
- Não há erros no console do navegador (F12)

**P: Posso deletar imagens antigas?**
R: Sim, delete os arquivos da pasta `public/images/produtos/` que não são mais usados

**P: Como ver todas as imagens enviadas?**
R: Acesse a pasta: `public/images/produtos/` no explorador de arquivos

---

## 🔒 Segurança

- ✅ Apenas gestores podem fazer upload
- ✅ Validação de tipo de arquivo
- ✅ Limite de tamanho (5MB)
- ✅ Nomes únicos para evitar sobrescrever

---

## 🚀 Início Rápido

**Para adicionar sua primeira imagem:**

1. Copie uma foto de produto para:
   ```
   public/images/produtos/meu-produto.jpg
   ```

2. No cadastro do produto, cole:
   ```
   /images/produtos/meu-produto.jpg
   ```

3. Salve e veja o produto com imagem! 🎉

---

Feito com ❤️ por Nexus B2B
