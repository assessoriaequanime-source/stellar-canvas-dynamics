# Roteiro de Deploy – Stellar Backend

> **Projeto:** stellar-backend  
> **Marca:** SingulAI  
> **Domínio:** `singulai.live`  
> **Data:** 2026-04-23  
> **Responsável técnico:** Chefe Run  
> **Validação CEO:** Rodrigo Alves  
> **Status:** Pronto para deploy

---

## PRÉ-REQUISITOS (confirme antes de executar)

- [ ] Acesso SSH à VPS: `ssh root@72.60.147.56`
- [ ] DNS `singulai.live` (e `www.singulai.live`) apontando para `72.60.147.56` (confirmar antes do SSL)
- [ ] Docker e Docker Compose instalados na VPS
- [ ] Node.js v20+ e npm v10+ instalados na VPS
- [ ] PM2 instalado globalmente: `npm install -g pm2`
- [ ] PostgreSQL e Redis disponíveis (via Docker Compose do projeto)
- [ ] `.env` criado manualmente na VPS (NUNCA commitar o .env real)

---

## FASE A — AUDITORIA DA VPS (execute ao conectar)

```bash
# Confirmar diretório e projetos existentes
pwd
ls -lah /var/www

# Verificar portas em uso (confirmar 9200 livre)
ss -tulpn | grep 9200

# Verificar serviços PM2 existentes (não alterar os de outros projetos)
pm2 list

# Verificar Nginx
nginx -t
ls -lah /etc/nginx/sites-enabled

# Verificar disco e memória
df -h && free -h
```

---

## FASE B — CLONAR / ATUALIZAR REPOSITÓRIO NA VPS

### Primeira vez (servidor novo)
```bash
mkdir -p /var/www/stellar-backend
cd /var/www/stellar-backend
git clone https://github.com/assessoriaequanime-source/stellar-canvas-dynamics .
cd stellar-backend
```

### Atualização (já existe)
```bash
cd /var/www/stellar-backend
git pull origin main
cd stellar-backend
```

---

## FASE C — CONFIGURAR VARIÁVEIS DE AMBIENTE

```bash
# Criar .env a partir do exemplo (preencher com valores reais)
cp .env.example .env
nano .env
```

Preencher obrigatoriamente:
| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `9200` |
| `DATABASE_URL` | `postgresql://stellar_user:{SENHA_DB}@127.0.0.1:5433/stellar_db` |
| `DB_PASSWORD` | `{SENHA_DB}` |
| `REDIS_URL` | `redis://:{SENHA_REDIS}@127.0.0.1:6380` |
| `REDIS_PASSWORD` | `{SENHA_REDIS}` |
| `JWT_SECRET` | `{SECRET_MINIMO_32_CHARS}` |
| `BLOCKCHAIN_RPC_URL` | RPC Sepolia |
| `SGL_DISTRIBUTOR_PRIVATE_KEY` | `{CHAVE_PRIVADA}` |

> ATENÇÃO: Nunca expor senhas, chaves privadas ou JWT secrets em commits, logs ou documentação.

---

## FASE D — SUBIR BANCO DE DADOS E REDIS (Docker Compose)

```bash
cd /var/www/stellar-backend/stellar-backend

# Subir apenas os serviços de banco e redis (não outros projetos)
docker compose up -d postgres redis

# Verificar containers do projeto
docker ps | grep stellar

# Aguardar inicialização (30s) e executar migrations
sleep 30 && npm run prisma:migrate
```

---

## FASE E — INSTALAR DEPENDÊNCIAS E BUILDAR

```bash
cd /var/www/stellar-backend/stellar-backend

npm install --production=false
npm run build

# Confirmar build gerado
ls -lah dist/
```

---

## FASE F — INICIAR SERVIÇO COM PM2

```bash
cd /var/www/stellar-backend/stellar-backend

# Iniciar com PM2 (nome único, isolado)
pm2 start dist/server.js --name backend-stellar-backend --env production

# Verificar status
pm2 status
pm2 logs backend-stellar-backend --lines 30

# Persistir entre reboots
pm2 save
```

---

## FASE G — CONFIGURAR NGINX

```bash
# Copiar configuração pronta
cp /var/www/stellar-backend/stellar-backend/nginx-stellar-backend.conf \
   /etc/nginx/sites-available/singulai-live

# Ativar site
ln -s /etc/nginx/sites-available/singulai-live \
   /etc/nginx/sites-enabled/singulai-live

# Validar (NUNCA recarregar sem passar no teste)
nginx -t

# Recarregar (somente se teste passar)
systemctl reload nginx
```

---

## FASE H — TESTES PÓS-DEPLOY

```bash
# Teste local (health check)
curl http://127.0.0.1:9200/api/v1/health

# Teste via domínio próprio (se DNS já estiver ativo)
curl http://singulai.live/api/v1/health

# Verificar logs do PM2
pm2 logs backend-stellar-backend --lines 50

# Verificar Nginx
systemctl status nginx
```

---

## FASE I — SSL (somente após DNS ativo)

> Confirmar antes: `ping singulai.live` deve retornar `72.60.147.56`

```bash
# Instalar Certbot (se não existir)
apt install -y certbot python3-certbot-nginx

# Gerar certificado APENAS para este domínio
certbot certonly --nginx -d singulai.live -d www.singulai.live

# Testar renovação
certbot renew --dry-run

# Recarregar Nginx após SSL
nginx -t && systemctl reload nginx
```

---

## ALERTA DE DNS

> Para que o deploy funcione publicamente, confirme os registros DNS de `singulai.live`:
>
> | Tipo | Nome | Valor |
> |------|------|-------|
> | A | `@` | `72.60.147.56` |
> | A | `www` | `72.60.147.56` |
>
> **Resultado esperado:** `singulai.live → 72.60.147.56`

---

## CHECKLIST DE CONCLUSÃO DO DEPLOY

- [ ] VPS auditada sem impacto em outros projetos
- [ ] Repositório clonado/atualizado em `/var/www/stellar-backend`
- [ ] `.env` criado na VPS com valores reais (sem commitar)
- [ ] Docker: postgres e redis subindo exclusivos do projeto
- [ ] Migrations executadas com sucesso (`npm run prisma:migrate`)
- [ ] Build gerado (`npm run build`)
- [ ] PM2 iniciado como `backend-stellar-backend`
- [ ] Nginx configurado e validado (`nginx -t`)
- [ ] Health check respondendo: `GET /api/v1/health`
- [ ] DNS apontado: `singulai.live → 72.60.147.56` e `www.singulai.live → 72.60.147.56`
- [ ] SSL configurado (somente após DNS ativo)
- [ ] Logs verificados sem erros críticos
- [ ] Nenhum outro projeto afetado

---

## ROLLBACK (se necessário)

```bash
# Parar serviço do projeto (somente este)
pm2 stop backend-stellar-backend
pm2 delete backend-stellar-backend

# Restaurar snapshot anterior
cd /workspaces/stellar-canvas-dynamics/stellar-backend
tar -xzf restore-points/rp-20260423-0221-auditlog.tar.gz

# Ou usar versão anterior (capsule+legacy)
tar -xzf restore-points/rp-20260423-015512-capsule-legacy.tar.gz
```

---

## PRÓXIMA FASE – Fase 4: Integração Web3 e Smart Contracts

Após deploy validado e aprovado pelo CEO Rodrigo Alves, iniciar:

### Objetivo
Integrar o backend com os smart contracts on-chain (Sepolia testnet):
- Leitura de saldo SGL (`SGL_TOKEN_ADDRESS`)
- Vinculação de avatar a wallet (`AVATAR_WALLET_LINK_ADDRESS`)
- Registro de consentimento on-chain (`CONSENT_REGISTRY_ADDRESS`)
- TimeCapsule on-chain (`TIME_CAPSULE_ADDRESS`)
- DigitalLegacy on-chain (`DIGITAL_LEGACY_ADDRESS`)

### Entregas esperadas
- Serviço `BlockchainService` com ethers.js v6
- Endpoints para leitura de dados on-chain
- Integração de eventos de blockchain com o AuditLog
- Testes de integração com RPC Sepolia
- Documentação e novo ponto de restauração

### Stack
- ethers.js v6 (já no projeto)
- Sepolia Testnet RPC
- Contratos já mapeados no `.env.example`

### Critério de entrada
- Deploy da fase atual aprovado pelo CEO Rodrigo Alves
- DNS e SSL ativos em `stellar-backend.rodrigo.run`
- Health check da API respondendo em produção

---

*Documento gerado em 2026-04-23 por Chefe Run | CEO Rodrigo Alves – validação pendente*
