# SingulAI — Guia de Deploy

> **Regra operacional crítica:** Este projeto é `singulai.live`. Nunca executar comandos que afetem `singulai.site`. São ambientes separados e independentes.

## Estrutura do ambiente

Ótimo. Aplicou os três ajustes e as builds passaram. Agora, antes do deploy final, execute este script rápido de validação para confirmar se o backend está respondendo ao endpoint de token do xAI (que é o que será usado na demo):

```bash
#!/bin/bash
echo "=== VALIDAÇÃO PÓS-BUILD ==="
echo "1. Backend rodando?"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "não"

echo ""
echo "2. Endpoint xAI token:"
curl -s -X POST http://localhost:8080/api/v1/xai/token \
  -H "Content-Type: application/json" | head -c 200

echo ""
echo ""
echo "3. Frontend rodando?"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "não"

echo ""
echo "=== FIM ==="
```

| Item | Valor |
| --- | --- |
| VPS IP | `72.60.147.56` |
| Projeto na VPS | `/projects/active/stellar-canvas-dynamics` |
| PM2 process | `singulai-live-dashboard` (id: 60) |
| Repositório | `https://github.com/assessoriaequanime-source/stellar-canvas-dynamics` |
| Branch principal | `main` |

> **Por que rebuild é obrigatório a cada deploy:** variáveis `VITE_*` são substituídas em tempo de build pelo Vite. Apenas reiniciar PM2 com `--update-env` não atualiza o frontend. O rebuild é sempre necessário.

---

## 1. Deploy padrão — singulai.live (script blindado)

Execute integralmente na VPS. O `set -euo pipefail` aborta em qualquer erro.

```bash
set -euo pipefail

echo "=== DEPLOY SINGULAI.LIVE ONLY ==="
cd /projects/active/stellar-canvas-dynamics

echo "=== Confirmar repo/branch ==="
pwd
git remote -v
git status --short --branch
git log --oneline -3

echo "=== Atualizar main ==="
git pull --ff-only origin main
git log --oneline -3

echo "=== Build com backend real ==="
VITE_ALT_API_BASE=https://singulai.live/alt-api \
VITE_SIMPLE_TEST_AUTH=0 \
npm run build

echo "=== Restart dashboard com env atualizado ==="
VITE_ALT_API_BASE=https://singulai.live/alt-api \
VITE_SIMPLE_TEST_AUTH=0 \
PORT=8080 \
pm2 restart singulai-live-dashboard --update-env

sleep 5

echo "=== Confirmar backend real ==="
pm2 list
curl -sI http://127.0.0.1:9200/health | head -5 || true
curl -s http://127.0.0.1:9200/health || true

echo "=== Confirmar rotas públicas ==="
curl -s -o /dev/null -w "live_root=%{http_code}\n" https://singulai.live/
curl -s -o /dev/null -w "live_demo=%{http_code}\n" https://singulai.live/demo
curl -s -o /dev/null -w "live_dashboard=%{http_code}\n" https://singulai.live/dashboard
curl -s -o /dev/null -w "live_vault=%{http_code}\n" https://singulai.live/vault
curl -s -o /dev/null -w "live_audit=%{http_code}\n" https://singulai.live/audit

echo "=== Confirmar alt-api ==="
curl -sI https://singulai.live/alt-api/v1/audit/events | head -8 || true

echo "=== Checar ausência de dados fake no HTML inicial ==="
curl -s -H "Accept-Encoding: identity" https://singulai.live/audit > /tmp/singulai-live-audit.html
grep -aRni "Autenticacao oficial obrigatoria\|Entrar via singulai.site\|singulai.site\|demo data\|fake" /tmp/singulai-live-audit.html && {
  echo "ERRO: conteúdo legado/demo encontrado"
  exit 1
} || echo "OK: sem gate legado/fake no HTML inicial"

echo "=== NÃO tocou singulai.site ==="
curl -sI https://singulai.site | head -3 || true

echo "=== Tudo OK — salvar PM2 ==="
pm2 save
```

---

## 2. Commit e push do dev container (GitHub Codespaces)

```bash
git add -A && git commit -m "feat: descrição" && git push origin main
```

---

## 3. Verificar status dos processos na VPS

```bash
pm2 list
pm2 logs singulai-live-dashboard --lines 50
```

---

## 4. Reiniciar apenas o processo (sem rebuild)

> Atenção: não aplica mudanças de frontend. Use apenas para reiniciar após crash sem code change.

```bash
pm2 restart singulai-live-dashboard && pm2 save
```

---

## 5. Rebuild completo + dependências (após mudanças em package.json)

```bash
cd /projects/active/stellar-canvas-dynamics && git pull --ff-only origin main && npm install && VITE_ALT_API_BASE=https://singulai.live/alt-api VITE_SIMPLE_TEST_AUTH=0 npm run build && PORT=8080 pm2 restart singulai-live-dashboard --update-env && pm2 save
```

---

## 6. Primeira vez num servidor novo

```bash
git clone https://github.com/assessoriaequanime-source/stellar-canvas-dynamics /projects/active/stellar-canvas-dynamics
cd /projects/active/stellar-canvas-dynamics
npm install
VITE_ALT_API_BASE=https://singulai.live/alt-api VITE_SIMPLE_TEST_AUTH=0 npm run build
pm2 start "node serve.mjs" --name singulai-live-dashboard
pm2 save
pm2 startup
```

---

## 7. Variáveis de ambiente obrigatórias no build

| Variável | Valor |
| --- | --- |
| `VITE_ALT_API_BASE` | `https://singulai.live/alt-api` |
| `VITE_SIMPLE_TEST_AUTH` | `0` (desativa auth simplificada em prod) |

---

## Fluxo completo de uma mudança

```text
1. Editar código no Codespace
2. git add -A && git commit -m "feat: …" && git push origin main
3. Na VPS: (comando do item 1 acima)
```
