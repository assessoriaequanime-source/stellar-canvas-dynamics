# SingulAI — Guia de Deploy

## Estrutura do ambiente

| Item | Valor |
|---|---|
| VPS IP | `72.60.147.56` |
| Projeto na VPS | `/projects/active/stellar-canvas-dynamics` |
| PM2 process | `singulai-live-dashboard` (id: 60) |
| Repositório | `https://github.com/assessoriaequanime-source/stellar-canvas-dynamics` |
| Branch principal | `main` |

---

## 1. Atualizar e publicar na VPS (uso diário)

```bash
cd /projects/active/stellar-canvas-dynamics && git pull origin main && VITE_ALT_API_BASE=https://singulai.live/alt-api VITE_SIMPLE_TEST_AUTH=0 npm run build && pm2 restart singulai-live-dashboard --update-env && pm2 save
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

```bash
pm2 restart singulai-live-dashboard && pm2 save
```

---

## 5. Rebuild completo + dependências (após mudanças em package.json)

```bash
cd /projects/active/stellar-canvas-dynamics && git pull origin main && npm install && VITE_ALT_API_BASE=https://singulai.live/alt-api VITE_SIMPLE_TEST_AUTH=0 npm run build && pm2 restart singulai-live-dashboard --update-env && pm2 save
```

---

## 6. Primeira vez num servidor novo

```bash
git clone https://github.com/assessoriaequanime-source/stellar-canvas-dynamics /projects/active/stellar-canvas-dynamics
cd /projects/active/stellar-canvas-dynamics
npm install
VITE_ALT_API_BASE=https://singulai.live/alt-api VITE_SIMPLE_TEST_AUTH=0 npm run build
pm2 start "npx wrangler dev --port 3000 --no-bundle" --name singulai-live-dashboard
pm2 save
pm2 startup
```

---

## 7. Variáveis de ambiente obrigatórias no build

| Variável | Valor |
|---|---|
| `VITE_ALT_API_BASE` | `https://singulai.live/alt-api` |
| `VITE_SIMPLE_TEST_AUTH` | `0` (desativa auth simplificada em prod) |

---

## Fluxo completo de uma mudança

```
1. Editar código no Codespace
2. git add -A && git commit -m "feat: …" && git push origin main
3. Na VPS: (comando do item 1 acima)
```
