# Week 1 – Backend Setup & Infrastructure

**Objective**: Criar ambiente de desenvolvimento seguro, isolado e pronto para codificação.

**Timeline**: 5 dias  
**Risk Level**: BAIXO (apenas setup, sem código business)  
**Team**: Run (Chefe Dev) + DevOps  

---

## Day 1: Auditoria VPS + Reserva de Recursos

### ✅ Tasks

#### 1.1 Auditoria Infra (Read-Only)
```bash
# Verificar status atual
ssh root@72.60.147.56 "echo 'Auditoria VPS'; pwd; ss -tulpn | grep -E ':5001|:5100|:8091|:9200'; df -h; free -h; docker ps"
```

**Esperado**:
- ✅ 3 processos SingulAI rodando (singulai, singulai-dev, singulai-alt-backend)
- ✅ Porta 9200 LIVRE (confirmada)
- ✅ PostgreSQL + Redis containers ativos
- ✅ Mínimo 5GB disco disponível

#### 1.2 Criar Raiz do Projeto
```bash
# Na VPS
mkdir -p /var/www/stellar-backend
ls -la /var/www/  # Validar isolamento
```

#### 1.3 Verificar Nginx Disponível
```bash
# Nginx status
ssh root@72.60.147.56 "systemctl status nginx; nginx -t"
```

**Esperado**: Nginx rodando, validação OK

---

## Day 2: PostgreSQL + Redis Setup (Docker)

### ✅ Tasks

#### 2.1 Docker Compose para Dados
**Arquivo**: `/var/www/stellar-backend/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: stellar-postgres
    environment:
      POSTGRES_DB: stellar_db
      POSTGRES_USER: stellar_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # ← .env
    volumes:
      - stellar_postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5433:5432"  # ← não expor publicamente
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stellar_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - stellar_network

  redis:
    image: redis:7-alpine
    container_name: stellar-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}  # ← .env
    volumes:
      - stellar_redis_data:/data
    ports:
      - "127.0.0.1:6380:6379"  # ← não expor publicamente
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - stellar_network

volumes:
  stellar_postgres_data:
    driver: local
  stellar_redis_data:
    driver: local

networks:
  stellar_network:
    driver: bridge
```

#### 2.2 Iniciar Containers
```bash
cd /var/www/stellar-backend
docker-compose up -d
docker-compose ps  # Validar
docker-compose logs postgres redis  # Verificar saúde
```

**Esperado**:
- ✅ PostgreSQL listening 127.0.0.1:5433
- ✅ Redis listening 127.0.0.1:6380
- ✅ Health checks passando
- ✅ Volumes criados e persistentes

#### 2.3 Testar Conexão
```bash
# PostgreSQL
psql -h 127.0.0.1 -p 5433 -U stellar_user -d stellar_db -c "SELECT version();"

# Redis
redis-cli -h 127.0.0.1 -p 6380 -a ${REDIS_PASSWORD} ping
```

---

## Day 3: Nginx Reverse Proxy

### ✅ Tasks

#### 3.1 Criar Config Nginx
**Arquivo**: `/etc/nginx/sites-available/stellar-backend`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name stellar-backend.rodrigo.run;

    # Logs segregados
    access_log /var/log/nginx/stellar-backend-access.log;
    error_log /var/log/nginx/stellar-backend-error.log;

    # Reverse proxy → backend interno porta 9200
    location / {
        proxy_pass http://127.0.0.1:9200;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket suporte (para eventos tempo real)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check endpoint (sem log)
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:9200/health;
    }
}
```

#### 3.2 Ativar Config
```bash
ln -s /etc/nginx/sites-available/stellar-backend /etc/nginx/sites-enabled/stellar-backend

# Validar
nginx -t

# Recarregar
systemctl reload nginx
```

#### 3.3 DNS Configuration
```
IMPORTANTE: Confirmar com CI que DNS foi criado:

Tipo: A
Name: stellar-backend
Value: 72.60.147.56
TTL: 3600

Resultado esperado: stellar-backend.rodrigo.run → 72.60.147.56
```

---

## Day 4: .env + Scripts Development

### ✅ Tasks

#### 4.1 Criar .env.example
**Arquivo**: `/var/www/stellar-backend/.env.example`

```env
# ─── Environment ───────────────────────────────────────
NODE_ENV=development
PORT=9200
LOG_LEVEL=debug

# ─── Database ──────────────────────────────────────────
DATABASE_URL=postgresql://stellar_user:password@127.0.0.1:5433/stellar_db
DB_PASSWORD=your_secure_password

# ─── Redis ─────────────────────────────────────────────
REDIS_URL=redis://:password@127.0.0.1:6380
REDIS_PASSWORD=your_redis_password

# ─── JWT Authentication ────────────────────────────────
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRATION=7d

# ─── Blockchain (Sepolia) ──────────────────────────────
BLOCKCHAIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SGL_TOKEN_ADDRESS=0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1
AVATAR_BASE_ADDRESS=0x95F531cafca627A447C0F1119B8b6aCC730163E5
TIME_CAPSULE_ADDRESS=0x6A58aD664071d450cF7e794Dac5A13e3a1DeD172
CONSENT_REGISTRY_ADDRESS=0x0Ee8f5dC7E9BC9AF344eB987B8363b33E737b757

# ─── Payment / SGL ─────────────────────────────────────
SGL_DISTRIBUTOR_PRIVATE_KEY=your_private_key_here  # ⚠️ NUNCA em .env production
TREASURY_ADDRESS=0xtreasury_address_here

# ─── GDPR / Compliance ─────────────────────────────────
DATA_RETENTION_DAYS=180  # Após este período, limpar dados antigos
CONSENT_VERIFICATION_ENABLED=true

# ─── Email / Notifications ────────────────────────────
SMTP_HOST=smtp.email.com
SMTP_PORT=587
SMTP_USER=noreply@rodrigo.run
SMTP_PASSWORD=email_password

# ─── API Keys ──────────────────────────────────────────
CORS_ORIGIN=http://localhost:5173,https://stellar-canvas.rodrigo.run
API_VERSION=v1

# ─── Monitoring ────────────────────────────────────────
SENTRY_DSN=https://your_sentry_dsn_here
```

#### 4.2 Criar .gitignore entry
```bash
# No repo root
echo "/var/www/stellar-backend/.env" >> .gitignore
echo "!.env.example" >> .gitignore
```

#### 4.3 Setup Scripts
**Arquivo**: `/var/www/stellar-backend/scripts/setup.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Stellar Backend Setup"

# Validar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não instalado"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# Validar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não instalado"
    exit 1
fi

DOCKER_VERSION=$(docker -v)
echo "✅ Docker: $DOCKER_VERSION"

# Criar .env se não existir
if [ ! -f .env ]; then
    echo "ℹ️  Criando .env do template"
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Editar .env com valores reais"
fi

# Instalar dependências Node
echo "📦 Instalando dependências Node..."
npm install

# Iniciar containers Docker
echo "🐳 Iniciando Docker Compose..."
docker-compose up -d

# Aguardar DB ready
echo "⏳ Aguardando PostgreSQL..."
sleep 5

# Rodar migrations Prisma
echo "🔄 Rodando Prisma migrations..."
npx prisma migrate dev

echo "✅ Setup completo!"
echo "ℹ️  Próximo passo: npm run dev"
```

---

## Day 5: Validação + Documentação

### ✅ Tasks

#### 5.1 Checklist Infra
```
[ ] PostgreSQL rodando (health check OK)
[ ] Redis rodando (health check OK)
[ ] Nginx configurado
[ ] DNS registrado (stellar-backend.rodrigo.run)
[ ] Portas não conflitam (9200 livre)
[ ] Nenhum processo existente afetado
[ ] Scripts setup executable
[ ] .env.example completo
[ ] Docker volumes persistem
```

#### 5.2 Criar DEPLOYMENT.md
```markdown
# Deployment Guide

## Local Development

### Primeiro setup
```bash
cd /var/www/stellar-backend
bash scripts/setup.sh
```

### Iniciar
```bash
npm run dev   # Development com hot reload
```

### Parar
```bash
npm run stop  # Para express
docker-compose down  # Para PostgreSQL + Redis
```

## VPS Deployment (Week 8+)

(Será documentado após fase inicial)
```

#### 5.3 Arquivo .MD Executável Week 1
**Arquivo**: `docs/week-1-setup-complete.md`

---

## Checklist Final Week 1

- [ ] Auditoria VPS concluída (3 processos existentes confirmados)
- [ ] Raiz `/var/www/stellar-backend/` criada
- [ ] PostgreSQL 15 container rodando em 127.0.0.1:5433
- [ ] Redis 7 container rodando em 127.0.0.1:6380
- [ ] Nginx reverse proxy configurado
- [ ] DNS registrado: stellar-backend.rodrigo.run
- [ ] .env.example criado (sem credenciais reais)
- [ ] Scripts de setup funcionando
- [ ] docker-compose.yml documentado
- [ ] Nenhum conflito com produção
- [ ] Pronto para Week 2 (codificação)

---

## Próximo: Week 2 – Express + TypeScript Setup

Após aprovação desta semana, iniciar:
- Express.js + TypeScript boilerplate
- Prisma schema definition
- Controllers base
- Authentication middleware

**Aguardando**: CEO confirmação para prosseguir
