# Playbook de Desenvolvimento - Run x SingulAI

Este playbook aplica o modelo de desenvolvimento da equipe Run ao projeto SingulAI.

## Etapa 1 - Analise

Checklist:

- Qual problema de negocio sera resolvido?
- Qual resultado esperado para usuario e operacao?
- Qual parte do sistema sera tocada?
- Existe risco de regressao?

## Etapa 2 - Briefing minimo

Checklist:

- Escopo principal definido.
- Escopo fora da entrega definido.
- Criterio de aceite objetivo.
- Dependencias e bloqueios mapeados.

## Etapa 3 - Implementacao por fases

Checklist:

- Fase 1: base tecnica.
- Fase 2: funcionalidade principal.
- Fase 3: acabamento e integracao.
- Fase 4: validacao final e documentacao.

## Etapa 4 - Validacao tecnica

Executar quando aplicavel:

- npm run lint
- npm run build

Validar manualmente:

- Fluxo principal da feature.
- Comportamento em erro.
- Responsividade.

## Etapa 5 - Operacao e deploy

- Se houver impacto de producao, revisar DEPLOY.md.
- Confirmar variaveis de ambiente necessarias.
- Confirmar comando oficial de build e restart.

## Etapa 6 - Entrega

Informar no fechamento:

1. Resumo da mudanca.
2. Arquivos alterados.
3. Evidencia de validacao.
4. Proximos passos, se existirem.