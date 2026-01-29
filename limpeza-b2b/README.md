# Nexus_B2b - Controle de Pedidos

Aplicação web B2B para controle de pedidos de equipes de limpeza, com banco principal MySQL (DB: Nexus_B2b) e integração ao ERP Oracle (PCPRODUT, PCCLIENT, PCPEDC, PCPEDI).

## Tecnologias
- Node.js + Express
- MySQL (mysql2/promise)
- Oracle (oracledb)
- JWT (autenticação)
- Front-end: HTML/CSS/JS puro (pode evoluir para React/Vue)

## Executando Localmente

1. Crie o banco MySQL e aplique o schema:

```bash
# Windows PowerShell
cp .env.example .env
# edite .env com suas credenciais MySQL/Oracle
npm install
npm run migrate
npm run dev
```

Servidor por padrão em http://localhost:3100

### Smoke tests (PowerShell)

```powershell
# 1) Health
Invoke-RestMethod -UseBasicParsing http://localhost:3100/health | ConvertTo-Json -Depth 5

# 2) Login (admin@local / admin123)
$body = @{ email = 'admin@local'; senha = 'admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://localhost:3100/api/auth/login -Method Post -Body $body -ContentType 'application/json'
$token = $login.token

# 3) GET protegido (equipes - requer perfil gestor)
Invoke-RestMethod -Uri http://localhost:3100/api/equipes -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

Front-end simples para testar:
- Login: http://localhost:3100/login.html
- Dashboard Gestor: http://localhost:3100/gestor.html (requer login; usa o JWT do login)
 - Página Equipe: http://localhost:3100/equipe.html (requer login; montar e enviar pedidos)

## Estrutura de Pastas
- src/config: conexões MySQL/Oracle
- src/middleware: autenticação e autorização (JWT)
- src/routes & src/controllers: API REST
- src/repositories & src/services: regra de negócio e acesso a dados
- public: páginas HTML/JS/CSS
- scripts/sql: schema MySQL e migrator

## Observações
- A integração Oracle tenta conectar usando variáveis ORACLE_*. Se indisponível, o endpoint de catálogo responde 503 (e pode cair em mock se habilitado).
- Exportações (PDF/Excel) podem ser adicionadas depois via endpoints /export.
