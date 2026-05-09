# Demo Script - Pitch Tecnico (2 minutos)

Objetivo: demonstrar aderencia ao escopo oficial, seguranca e prova on-chain sem extrapolar tempo.

## Bloco 1 - Abertura (0:00-0:20)

Mensagem:

- O MVP oficial roda em Solana Devnet.
- Rotas oficiais de demonstracao: /vault e /audit.
- Sem dados privados on-chain.

Prova rapida:

- Mostrar a tela /vault carregada.
- Mostrar a tela /audit carregada.

## Bloco 2 - Fluxo funcional (0:20-1:00)

Passos:

1. Inicializar avatar (PDA) com score inicial.
2. Executar update PAS.
3. Mostrar mudanca de estado e logs de evento.

Evidencia:

- Hash da transacao de inicializacao.
- Hash da transacao de update.
- Log com AvatarInitialized e ScoreUpdated.

## Bloco 3 - Seguranca (1:00-1:30)

Passos:

1. Tentar update com outra wallet (falha esperada).
2. Tentar inicializacao sem posse de NFT (falha esperada).

Narrativa:

- Falhou como esperado, portanto o controle de seguranca passou.

Evidencia:

- Hash das transacoes de falha.
- Logs de erro de autorizacao e validacao.

## Bloco 4 - Governanca PAS (1:30-1:50)

Passos:

1. Mostrar thresholds de maturidade.
2. Mostrar transicao de nivel apos update.
3. Explicar acao critica restrita ao nivel Trusted.

Evidencia:

- Estado da conta antes e depois.
- Tx hash de bloqueio por nivel inadequado.

## Bloco 5 - Encerramento (1:50-2:00)

Mensagem final:

- Escopo oficial cumprido.
- Provas on-chain coletadas.
- Reprodutibilidade documentada.

## Checklist de operacao no dia

1. Executar script de verificacao rapida pre-banca.
2. Validar rede devnet e Program ID.
3. Confirmar que /vault e /audit estao acessiveis.
4. Separar os hashes de sucesso e de falha esperada.
5. Abrir o checklist em docs/HACKATHON_SUBMISSION_CHECKLIST.md para marcar ao vivo.
