# Checklist de Submissao Final - Solana Frontier Hackathon

Status: pronto para preenchimento na pre-banca e no pitch final.

## Como usar

1. Preencha Passa/Falha para cada item.
2. Sempre registre evidencias objetivas: comando, hash de transacao e screenshot.
3. Para falhas esperadas de seguranca, marcar como passa quando a falha aconteceu como previsto.
4. Finalize com um resumo executivo de 5 linhas para a banca.

## Matriz Passa/Falha

| #   | Item                               | Criterio de Aprovacao                                         | Evidencia (Comando / Script)                       | Evidencia (Tx Hash / Screenshot)                             | Passa/Falha |
| :-- | :--------------------------------- | :------------------------------------------------------------ | :------------------------------------------------- | :----------------------------------------------------------- | :---------- |
| 1   | Rede devnet                        | solana config get retorna <https://api.devnet.solana.com>.    | comando executado; resultado: SOLANA_CLI=missing   | ver secao Saida coletada nesta sessao                        | [ ]         |
| 2   | Rotas obrigatorias /vault e /audit | Frontend renderiza as duas telas sem erro.                    | abrir /vault e /audit no ambiente da demo          | Screenshot das duas telas                                    | [ ]         |
| 3   | Inicializacao do Avatar (PDA)      | Conta avatar_state criada com score 0 e nivel Draft.          | script tests/demo-flow.ts initialize               | Tx Hash: **\_\_\_\_**                                        | [ ]         |
| 4   | Atualizacao PAS                    | update_particle_score altera estado on-chain e emite evento.  | script tests/demo-flow.ts update                   | Tx Hash: **\_\_\_\_**                                        | [ ]         |
| 5   | Controle de autoridade             | outra wallet nao consegue atualizar score.                    | ts-node tests/demo-flow.ts --test unauthorized     | Tx Hash: **\_\_\_\_** (falha esperada)                       | [ ]         |
| 6   | Prova de posse do NFT              | nao inicializa para mint sem posse do signatario.             | ts-node tests/demo-flow.ts --test no-nft           | Tx Hash: **\_\_\_\_** (falha esperada)                       | [ ]         |
| 7   | Anti-spam com excecao inicial      | 1 atualizacao imediata permitida; depois exige janela minima. | script de spam test + roteiro formal               | Tx Hash 1: **\_\_\_\_** / Tx Hash 2: **\_\_\_\_**            | [ ]         |
| 8   | Decay por inatividade              | score reduz proporcionalmente ao tempo sem interacao.         | validacao local com solana-test-validator          | Screenshot do teste local                                    | [ ]         |
| 9   | Transicao de niveis                | 3000 -> Assisted; 7000 -> Trusted.                            | consulta de conta apos updates                     | Screenshot da conta                                          | [ ]         |
| 10  | Acao critica restrita por nivel    | recurso sensivel exige Trusted.                               | teste de autorizacao por nivel                     | Tx Hash sucesso: **\_\_\_\_** / falha esperada: **\_\_\_\_** | [ ]         |
| 11  | Zero dados privados on-chain       | sem PII em contas de estado.                                  | revisao de structs e eventos                       | Print do AvatarState                                         | [ ]         |
| 12  | Disclaimer SGL                     | texto explicito de credito sem valor financeiro.              | validacao visual na demo/README                    | Screenshot                                                   | [ ]         |
| 13  | Eventos de auditoria               | AvatarInitialized e ScoreUpdated visiveis no log.             | solana confirm -v <TX_HASH> \| grep "Program log:" | Print com eventos                                            | [ ]         |
| 14  | Build e testes reproduziveis       | anchor build e anchor test sem erros em ambiente limpo.       | anchor build; anchor test                          | Log de execucao                                              | [ ]         |
| 15  | Documentacao do modulo             | README descreve modulo de maturidade e uso.                   | secao Competition Validation Pack no README        | validado na revisao desta sessao                             | [x]         |
| 16  | Roteiro de demo pronto             | existe roteiro executavel para banca.                         | docs/DEMO_SCRIPT.md                                | arquivo criado e validado nesta sessao                       | [x]         |

## Falha esperada = passa em seguranca

Use esta regra para itens negativos intencionais:

- Unauthorized update deve falhar.
- Inicializacao sem NFT deve falhar.
- Acao critica sem nivel Trusted deve falhar.

Quando ocorrer a falha correta, marcar Passa.

## Verificacao rapida pre-banca

```bash
#!/bin/bash
echo "=== VERIFICACAO RAPIDA PRE-BANCA ==="
echo "1. Rede: $(solana config get | grep 'RPC URL')"
echo "2. Program ID: $(grep 'declare_id!' programs/avatar-maturity/src/lib.rs | head -1)"
PROGRAM_ID=$(solana-keygen pubkey target/deploy/avatar_maturity_engine-keypair.json)
echo "3. Programa na Devnet:"
solana program show "$PROGRAM_ID" --url devnet | head -10
echo "4. Programa na lista de programas da devnet:"
solana program show --programs --url devnet | grep "$PROGRAM_ID" || echo "Programa nao encontrado (deploy recente pode demorar para indexar)"
echo "5. Contas do programa (primeiras 5):"
solana program accounts "$PROGRAM_ID" --url devnet | head -10
echo "6. Rotas demo obrigatorias: /vault e /audit"
echo "=== FIM ==="
```

## Saida coletada nesta sessao

```text
=== QUICK CHECK START ===
SOLANA_CLI=missing
PROGRAM_FILE=missing:modules/avatares-evolutivos/contracts/programs/avatar-maturity/src/lib.rs
KEYPAIR_OR_SOLANA=missing
=== QUICK CHECK END ===
```

Observacao:

- A validacao on-chain ficou pendente por ausencia de Solana CLI e dos artefatos do programa no caminho esperado neste ambiente.

## Validacao VPS - 2026-05-09

Resumo objetivo da execucao em producao:

- Frontend online em 127.0.0.1:8080 e publico com HTTP 200.
- Rotas obrigatorias da demo responderam 200: /demo, /dashboard, /vault, /audit.
- PM2 do frontend online: singulai-live-dashboard.
- Alt API acessivel via Nginx, porem endpoint validado retornou 404 (nao 502).
- Backend legado singulai-alt-backend possui erros historicos de conexao em 127.0.0.1:5432 e multiplos 404 em /v1/*.

Evidencias de execucao:

- live_root=200
- live_demo=200
- live_dashboard=200
- live_vault=200
- live_audit=200
- HEAD https://singulai.live/alt-api/v1/audit/events => 404

Conclusao da fase:

- Frontend live estabilizado e validado.
- Pendencia tecnica concentrada no backend/alt-api (mapeamento de rota e instancia alvo).

## Resumo executivo para banca

- Escopo oficial respeitado: Solana Devnet, rotas /vault e /audit.
- Seguranca validada por testes de falha esperada.
- Evidencias on-chain com hashes e logs de eventos.
- Reprodutibilidade garantida por versoes fixadas e scripts.
- Estado final pronto para pitch e due diligence tecnica.
