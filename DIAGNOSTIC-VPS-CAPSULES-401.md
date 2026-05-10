# Diagnóstico e Correção: 401 em GET /api/v1/capsules (VPS)

**Data:** 2026-05-09  
**Problema:** Rota `GET /api/v1/capsules` retorna 401 UNAUTHORIZED apesar do middleware `requireAuth` ter sido removido no código-fonte.  
**Causa raiz:** Build na VPS está desatualizado (dist/ ainda contém requireAuth compilado)

---

## Status Local (Confirmado ✅)

**Código-fonte em VS Code:**

```bash
$ grep -n "router.get(\"/\"" stellar-backend/src/api/routes/capsules.ts
112:// router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
113:router.get("/", async (req: Request, res: Response, next: NextFunction) => {
```

**Commit:**

```bash
$ git log --oneline -1
00abe00 fix: remove auth requirement for demo and add narrative chat endpoint

$ git push origin main
...
Total 3 (delta 2), reused 0 (delta 0), pack-reused 0
```

✅ Código correto está em `origin/main`

---

## Diagnóstico na VPS

Execute **EXATAMENTE** estes comandos na VPS:

```bash
#!/bin/bash
cd /projects/active/stellar-canvas-dynamics/stellar-backend

echo "=== STEP 1: Verificar arquivo-fonte da VPS ==="
grep -n "router.get(\"/\"" src/api/routes/capsules.ts | head -2

echo ""
echo "=== STEP 2: Verificar se dist ainda tem requireAuth ==="
if grep -q "requireAuth" dist/api/routes/capsules.js; then
  echo "❌ dist/ AINDA CONTÉM requireAuth"
  echo ""
  echo "=== STEP 3: Fazer pull da main branch ==="
  git pull origin main

  echo ""
  echo "=== STEP 4: Verificar arquivo-fonte após pull ==="
  grep -n "router.get(\"/\"" src/api/routes/capsules.ts | head -2

  echo ""
  echo "=== STEP 5: Limpar e reconstruir ==="
  rm -rf dist
  npm run build

  echo ""
  echo "=== STEP 6: Reiniciar serviço ==="
  pm2 restart singulai-alt-backend --update-env
  sleep 3

  echo ""
  echo "=== STEP 7: Verificar se requireAuth foi removido do dist ==="
  if grep -q "requireAuth" dist/api/routes/capsules.js; then
    echo "❌ ERRO: requireAuth AINDA no dist após rebuild!"
    grep "requireAuth" dist/api/routes/capsules.js | head -2
  else
    echo "✅ OK: requireAuth removido do dist"
  fi
else
  echo "✅ dist/ JÁ ESTÁ CORRETO (sem requireAuth)"
fi

echo ""
echo "=== TESTE FINAL: GET /api/v1/capsules ==="
curl -s http://127.0.0.1:9200/api/v1/capsules
```

---

## Se o dist ainda tiver requireAuth após rebuild

Se o `grep` do STEP 2 ou STEP 7 retornar linhas com requireAuth, execute manualmente:

```bash
cd /projects/active/stellar-canvas-dynamics/stellar-backend

# Corrigir arquivo-fonte diretamente
sed -i 's/router\.get("\/", requireAuth,/router.get("\/",/' src/api/routes/capsules.ts
sed -i 's/router\.post("\/", requireAuth,/router.post("\/",/' src/api/routes/capsules.ts

# Reconstruir
rm -rf dist && npm run build

# Reiniciar
pm2 restart singulai-alt-backend --update-env
sleep 3

# Testar
curl -s http://127.0.0.1:9200/api/v1/capsules | jq .
```

---

## Resultado Esperado

Se os passos acima forem executados com sucesso:

```bash
# GET /api/v1/capsules (deve retornar [] ou lista de cápsulas, NÃO 401)
[]

# Se houver cápsulas:
[
  {
    "id": "....",
    "name": "...",
    "content": "...",
    "userId": "...",
    "createdAt": "...",
    ...
  }
]

# Status: ✅ 200 OK
```

---

## Validação Completa

Execute após a correção:

```bash
echo "=== Chat narrativo ==="
curl -s -X POST http://127.0.0.1:9200/api/v1/avatarpro/message \
  -d '{"avatar":"pedro","message":"test"}' \
  -H "Content-Type: application/json" | jq .

echo ""
echo "=== Token de voz ==="
curl -s -X POST http://127.0.0.1:9200/api/v1/xai/token \
  -H "Content-Type: application/json" | jq .

echo ""
echo "=== Capsulas (deve retornar [] ou dados, NÃO 401) ==="
curl -s http://127.0.0.1:9200/api/v1/capsules | jq .
```

---

## Se persistir o erro após todos os passos

1. Confirmar que o arquivo-fonte foi atualizado: `cat src/api/routes/capsules.ts | grep -A 1 "router.get("`
2. Checar se há conflitos de merge: `git status`
3. Limpar cache do npm: `cd stellar-backend && npm ci` (em vez de `npm install`)
4. Verificar versão do Node: `node --version` (deve ser >= 18.x)

---

**Commit de origem:** `00abe00`  
**Branch:** `main`  
**Data de geração:** 2026-05-09 08:56 UTC
