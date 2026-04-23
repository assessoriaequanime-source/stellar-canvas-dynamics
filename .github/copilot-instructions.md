# Modelo de Desenvolvimento SingulAI

Este projeto usa o modelo de desenvolvimento da equipe Run com foco em governanca tecnica, execucao por fases e seguranca operacional.

## Objetivo

Aplicar um fluxo previsivel para qualquer entrega:

1. Analise tecnica da demanda.
2. Briefing minimo com clareza de escopo.
3. Plano de execucao por fases.
4. Implementacao incremental.
5. Validacao tecnica.
6. Validacao estrategica.
7. Documentacao e orientacao de deploy.

## Regras de execucao

- Nao pular etapas de analise, planejamento e validacao.
- Toda mudanca deve preservar estabilidade do que ja funciona.
- Preferir alteracoes pequenas, rastreaveis e com impacto controlado.
- Antes de editar, mapear arquivos afetados e risco de regressao.
- Depois de editar, validar build e lint quando aplicavel.
- Quando houver impacto operacional, atualizar documentacao.

## Padrao tecnico deste repositorio

- Frontend em React + TypeScript com Vite.
- Roteamento com TanStack Router em src/routes.
- Componentes de interface em src/components e src/components/ui.
- Utilitarios e servicos em src/lib.
- Estilos globais em src/styles.css.

## Definicao de pronto

Uma tarefa so e considerada concluida quando:

1. Objetivo funcional foi atendido.
2. Nao houve regressao evidente no fluxo existente.
3. Mudancas estao consistentes com o padrao do projeto.
4. Foram executadas validacoes tecnicas pertinentes.
5. Foi documentado o que mudou e como validar.

## Comandos de validacao

- Desenvolvimento: npm run dev
- Lint: npm run lint
- Build: npm run build
- Preview: npm run preview

## Operacao e deploy

Para orientacoes operacionais e comandos de deploy em VPS, usar DEPLOY.md como referencia oficial.