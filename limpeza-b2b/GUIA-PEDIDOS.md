# 📧 Guia Completo - Sistema de Pedidos e Notificações

## 🎯 Como Funciona

Quando uma **equipe** finaliza um pedido no catálogo:

1. ✅ **Pedido é salvo** no banco de dados com status "AGUARDANDO"
2. 📧 **Email automático** é enviado para o vendedor responsável
3. 🔔 **Notificação** aparece no painel do gestor
4. 👀 **Gestor pode visualizar** na aba "Pedidos"

---

## ⚙️ Configuração Rápida (5 minutos)

### 1️⃣ Configure o Email

Edite o arquivo `.env` e configure:

```env
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM=Nexus B2B <nexus-b2b@empresa.com>
```

### 📧 Como obter senha de app do Gmail:

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "Email" e "Outro dispositivo"
3. Digite "Nexus B2B"
4. Copie a senha gerada (16 caracteres)
5. Cole no `.env` em `EMAIL_PASS`

### 2️⃣ Configure o Email do Vendedor

No painel **Gestor** → aba **Equipes**:

1. Clique em "Editar" na equipe
2. Preencha o campo **"Email do Vendedor"**
3. Salve

---

## 🧪 Testando o Sistema

### Teste Completo:

1. **Como Gestor:**
   - Acesse: http://localhost:3100/login.html
   - Login: `admin@nexus.com` / `admin123`
   - Vá na aba "Equipes"
   - Configure o email do vendedor (pode ser seu próprio email para teste)

2. **Como Equipe:**
   - Faça logout (botão "Sair")
   - Faça login com usuário da equipe
   - Adicione produtos ao carrinho
   - Clique em "Finalizar Pedido"
   - ✅ Deve aparecer: "Pedido enviado com sucesso! O gestor foi notificado por email."

3. **Verifique:**
   - 📧 Chegou o email? (verifique spam também)
   - 👀 Faça login como gestor novamente
   - 📋 Vá na aba "Pedidos"
   - 🎉 O pedido deve estar lá com status "AGUARDANDO"

---

## 📋 Fluxo Completo do Pedido

```
┌─────────────┐
│   EQUIPE    │
│  (Catalogo) │
└──────┬──────┘
       │ 1. Adiciona produtos
       │ 2. Clica "Finalizar Pedido"
       ▼
┌─────────────┐
│   BACKEND   │
│ (API /api/  │
│   pedidos)  │
└──────┬──────┘
       │ 3. Salva no banco
       │ 4. Envia email
       │ 5. Retorna sucesso
       ▼
┌─────────────────────┐
│  📧 EMAIL ENVIADO   │
│  Para: Vendedor     │
│  Assunto: Novo      │
│  Pedido #123        │
└─────────────────────┘
       +
┌─────────────────────┐
│  👨‍💼 PAINEL GESTOR  │
│  Aba: Pedidos       │
│  Status: AGUARDANDO │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  GESTOR APROVA      │
│  (Clica "Aprovar")  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Status: ENVIADO    │
│  (Integra c/ Oracle)│
└─────────────────────┘
```

---

## 📧 Template do Email

O email enviado contém:

- 🏢 **Nome da Equipe**
- 📅 **Data e Hora do pedido**
- 💰 **Valor Total**
- 📊 **Status** (AGUARDANDO)
- 🛍️ **Tabela com todos os itens:**
  - Código do produto
  - Descrição
  - Quantidade
  - Valor unitário
  - Valor total

**Design:** Email moderno e responsivo com cores do Nexus B2B (verde)

---

## 🔍 Troubleshooting

### ❌ Email não está sendo enviado?

**1. Verifique as variáveis de ambiente:**
```bash
# No terminal
echo $env:EMAIL_USER
echo $env:EMAIL_PASS
```

**2. Verifique os logs do servidor:**
```
✅ Configuração de email carregada
✅ Email enviado para vendedor@email.com - Pedido #123
```

Ou:
```
❌ Erro ao enviar email: Invalid login
```

**3. Email do vendedor está cadastrado?**
- Vá no painel Gestor → Equipes
- Verifique se o campo "Email do Vendedor" está preenchido

**4. Senha de app do Gmail está correta?**
- A senha tem 16 caracteres?
- Você ativou a verificação em 2 etapas?
- Gerou uma senha de app específica?

### ❌ Pedido não aparece no painel do gestor?

**1. Verifique se salvou no banco:**
```sql
SELECT * FROM pedidos ORDER BY data DESC LIMIT 5;
```

**2. Faça login como gestor:**
- Email: `admin@nexus.com`
- Senha: `admin123`
- Aba: "Pedidos"

**3. Verifique os filtros:**
- Está filtrando por status específico?
- Limpe os filtros e tente novamente

### ❌ Erro "equipe não identificada"?

- Faça logout e login novamente
- Verifique se o token JWT tem `equipe_id`

---

## 🎨 Personalizando o Email

Edite o arquivo:
```
src/services/emailService.js
```

Função: `gerarTemplateEmail()`

Você pode alterar:
- Cores (atualmente verde: #22c55e)
- Logo (adicione `<img src="...">`)
- Texto
- Formatação

---

## 📊 Monitoramento

### Ver todos os pedidos no banco:
```sql
SELECT 
  p.id, 
  e.nome AS equipe,
  p.valor_total,
  p.status,
  p.data
FROM pedidos p
JOIN equipes e ON e.id = p.equipe_id
ORDER BY p.data DESC;
```

### Ver itens de um pedido:
```sql
SELECT * FROM itens_pedido WHERE pedido_id = 1;
```

---

## ✅ Checklist Final

- [ ] Configurei `EMAIL_USER` e `EMAIL_PASS` no `.env`
- [ ] Configurei email do vendedor na equipe
- [ ] Testei fazer um pedido como equipe
- [ ] Recebi o email de notificação
- [ ] Pedido aparece no painel do gestor
- [ ] Consigo aprovar o pedido

---

## 🚀 Pronto para Produção

Para usar em produção:

1. **Configure um serviço de email profissional:**
   - SendGrid
   - Mailgun
   - AWS SES
   - Ou servidor SMTP próprio

2. **Atualize as configurações no banco:**
```sql
INSERT INTO email_config 
(smtp_host, smtp_port, smtp_user, smtp_pass, ativo) 
VALUES 
('smtp.seuservidor.com', 587, 'noreply@empresa.com', 'senha', 1);
```

3. **Configure alertas:**
   - Monitore se os emails estão sendo enviados
   - Configure fallback (SMS, WhatsApp)

---

## 💡 Dicas

1. **Use um email específico:** Em vez de usar seu email pessoal, crie um email tipo `pedidos@empresa.com` ou `noreply@empresa.com`

2. **Monitore a caixa de spam:** Os primeiros emails podem cair no spam. Peça aos vendedores para marcarem como "não é spam"

3. **Templates personalizados:** Você pode criar templates diferentes para cada tipo de notificação (novo pedido, aprovação, cancelamento)

4. **Backup:** Configure notificações também por WhatsApp ou SMS para garantir que o vendedor seja avisado

---

Feito com ❤️ por Nexus B2B
