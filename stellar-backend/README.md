# Stellar Backend

Enterprise-grade backend for Stellar Canvas Dynamics - a Web3 avatar platform with GDPR compliance, blockchain integration, and AI orchestration.

## 🏗️ Architecture

```
stellar-backend (Node.js + Express + TypeScript)
    ├── PostgreSQL 15 (stellar_db)
    ├── Redis 7 (caching + sessions)
    └── Blockchain readers (ethers.js v6, Sepolia testnet)
```

## 📋 Requirements

- **Node.js**: v20.0.0+
- **npm**: v10.0.0+
- **Docker**: v29.0.0+
- **Docker Compose**: v2.0.0+

## 🚀 Quick Start

### 1. Local Development Setup

```bash
# Clone repository (or navigate to stellar-backend directory)
cd stellar-backend

# Run setup script (installs deps, creates .env, starts Docker containers)
bash scripts/setup.sh
```

### 2. Configure Environment

```bash
# Edit .env with your values
nano .env
```

Key variables to set:
- `DB_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: JWT signing secret (min 32 chars)
- `BLOCKCHAIN_RPC_URL`: Sepolia RPC endpoint

### 3. Start Development Server

```bash
npm run dev
```

Server runs at: `http://localhost:9200`

## 📚 Available Commands

### Development
```bash
npm run dev           # Start with hot-reload (nodemon)
npm run build         # Build TypeScript to dist/
npm run start         # Run production build
npm run stop          # Stop running server
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Code Quality
```bash
npm run lint          # Check code style
npm run lint:fix      # Auto-fix code style
npm run typecheck     # TypeScript type checking
```

### Database
```bash
npm run prisma:migrate  # Run Prisma migrations
npm run prisma:studio   # Open Prisma Studio GUI
```

### Docker
```bash
npm run docker:up     # Start PostgreSQL + Redis
npm run docker:down   # Stop and remove containers
npm run docker:logs   # View Docker logs
```

## 🔗 Database

### PostgreSQL (Development)

```
Host: 127.0.0.1
Port: 5433
Database: stellar_db
User: stellar_user
```

### Redis (Development)

```
Host: 127.0.0.1
Port: 6380
Auth: ${REDIS_PASSWORD}
```

## 🔐 Environment Variables

See `.env.example` for all available options.

**Critical variables**:
- `NODE_ENV`: Set to `development` or `production`
- `UDP_PASSWORD`: Secure password for database
- `JWT_SECRET`: Secret for JWT signing
- `BLOCKCHAIN_RPC_URL`: Sepolia RPC for blockchain reads

## 📖 Project Structure

```
src/
├── api/                    # HTTP API layer
│   ├── controllers/        # Request handlers
│   ├── routes/            # Route definitions
│   └── middlewares/       # Express middlewares
├── services/              # Business logic
├── models/                # Prisma models & data schemas
├── config/                # Configuration files
├── lib/                   # Utility libraries
├── queue/                 # Bull job queues
├── types/                 # TypeScript types
└── server.ts              # Express app entry point

docs/                      # Documentation
tests/                     # Test files
logs/                      # Runtime logs
```

## 🧩 Avatar Interaction Expansion (Scaffold)

This repository now includes a non-invasive scaffold for future avatar interaction upgrades:

- sentimental voice synthesis via ElevenLabs
- custom LLM/TTS provider integration (user-owned API)

Location:

```
src/integrations/avatar-interaction/
├── contracts/
├── providers/
│   ├── llm/
│   └── voice/
├── registry/
└── application/
```

Activation status:

- default: disabled
- no runtime wiring yet
- pending expansion rollout with feature flags

## 🔌 API Endpoints (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/auth/login` | User authentication |
| `GET` | `/api/v1/avatars` | List avatars |
| `POST` | `/api/v1/sessions` | Create paid session |
| `POST` | `/api/v1/consent` | Register consent |
| `GET` | `/api/v1/wallet/balance` | Check SGL balance |

Full API documentation: See `docs/API.md` (coming in Week 2)

## 🧪 Testing

Run all tests:
```bash
npm test
```

With coverage:
```bash
npm run test:coverage
```

## 🐳 Docker Commands

Start containers:
```bash
docker-compose up -d
```

View status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f postgres redis
```

Stop everything:
```bash
docker-compose down
```

## 🚀 Deployment

See `docs/DEPLOYMENT.md` for VPS setup instructions.

### Production Build

```bash
npm run build
npm start
```

### Docker Build

```bash
docker build -t stellar-backend:latest .
docker run -p 9200:9200 --env-file .env stellar-backend:latest
```

## 📝 Logs

Development logs are written to:
- Console (stdout)
- `logs/app.log`

View logs:
```bash
tail -f logs/app.log
```

## 🛡️ Security

- CORS: Configured for allowed origins
- Rate limiting: 10 req/s per IP (configurable)
- JWT: Signed tokens with expiration
- ReentrancyGuard: Blockchain transaction safety
- HTTPS: Use in production (via Nginx + Let's Encrypt)

## 🔄 CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml` (coming Week 2)

## 📞 Support

**Issues**: Report via GitHub Issues  
**Questions**: Review `docs/` folder  
**Development Lead**: Run (Chefe Desenvolviment)

## 📄 License

MIT License © 2026 SingulAI

---

**Status**: Phase 4 Week 1 (Infrastructure Setup) ✅  
**Next**: Week 2 - Core API Development
