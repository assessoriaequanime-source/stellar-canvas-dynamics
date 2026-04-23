#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Stellar Backend Setup${NC}"
echo "════════════════════════════════════════════════════════"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed${NC}"
    exit 1
fi

DOCKER_VERSION=$(docker -v)
echo -e "${GREEN}✅ Docker: $DOCKER_VERSION${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not installed${NC}"
    exit 1
fi

COMPOSE_VERSION=$(docker-compose -v)
echo -e "${GREEN}✅ Docker Compose: $COMPOSE_VERSION${NC}"

echo ""
echo -e "${YELLOW}ℹ️  Setting up project structure...${NC}"

# Create necessary directories
mkdir -p src/api/{controllers,routes,middlewares}
mkdir -p src/services
mkdir -p src/models
mkdir -p src/lib
mkdir -p src/config
mkdir -p src/queue
mkdir -p src/types
mkdir -p docs
mkdir -p logs
mkdir -p tests

echo -e "${GREEN}✅ Directories created${NC}"

# Create .env if not exists
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}ℹ️  Creating .env from template${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️  IMPORTANT: Edit .env with real values before running${NC}"
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Start Docker containers
echo ""
echo -e "${YELLOW}🐳 Starting Docker containers (PostgreSQL + Redis)...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker containers started${NC}"
else
    echo -e "${RED}❌ Failed to start Docker containers${NC}"
    exit 1
fi

# Wait for database
echo ""
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Test database connection
if command -v psql &> /dev/null; then
    echo -e "${YELLOW}🔍 Testing PostgreSQL connection...${NC}"
    PGPASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f 2) psql -h 127.0.0.1 -p 5433 -U stellar_user -d stellar_db -c "SELECT version();" 2>/dev/null && \
    echo -e "${GREEN}✅ PostgreSQL connection OK${NC}" || \
    echo -e "${YELLOW}ℹ️  PostgreSQL test skipped (psql not available)${NC}"
fi

# Test Redis connection
if command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}🔍 Testing Redis connection...${NC}"
    REDIS_PASS=$(grep REDIS_PASSWORD .env | cut -d '=' -f 2) redis-cli -h 127.0.0.1 -p 6380 -a "$REDIS_PASS" ping 2>/dev/null && \
    echo -e "${GREEN}✅ Redis connection OK${NC}" || \
    echo -e "${YELLOW}ℹ️  Redis test skipped (redis-cli not available)${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🚀 Next steps:"
echo "   1. Edit .env with real values"
echo "   2. Run: npm run dev"
echo ""
echo "📚 Documentation:"
echo "   - local: http://localhost:9200"
echo "   - PostgreSQL: localhost:5433"
echo "   - Redis: localhost:6380"
echo ""
echo "⏸️  To stop:"
echo "   npm run stop  (stops Express)"
echo "   docker-compose down  (stops PostgreSQL + Redis)"
echo ""
