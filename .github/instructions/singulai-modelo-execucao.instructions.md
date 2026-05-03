---
applyTo: "src/**/*.{ts,tsx,css},package.json,vite.config.ts,wrangler.jsonc,DEPLOY.md"
description: "Use when: implementando features, corrigindo bugs, refatorando arquitetura, preparando deploy ou validando qualidade no projeto SingulAI"
---

# Instrucoes de Execucao - Modelo SingulAI

## 1. Fluxo obrigatorio por tarefa

1. Entender demanda e objetivo de negocio.
2. Levantar arquivos afetados e riscos.
3. Definir plano curto de implementacao.
4. Implementar em incrementos pequenos.
5. Validar tecnicamente (lint/build/teste local quando houver).
6. Registrar impacto e passos de verificacao.

## 2. Regras de qualidade de codigo

- Preservar padroes existentes de nomenclatura e estrutura.
- Evitar refatoracoes amplas sem necessidade direta da tarefa.
- Preferir componentes reaproveitaveis.
- Evitar duplicacao quando houver utilitario ja existente em src/lib ou src/components/ui.
- Manter tipagem TypeScript explicita quando a inferencia nao for clara.

## 3. Regras de frontend

- Garantir responsividade para desktop e mobile.
- Evitar alteracoes visuais abruptas fora do escopo da demanda.
- Preservar consistencia com a biblioteca de componentes em src/components/ui.
- Validar estados basicos de interface: carregando, vazio, sucesso e erro quando aplicavel.

## 4. Regras de entrega

Ao concluir qualquer tarefa, sempre informar:

1. O que foi alterado.
2. Quais arquivos foram impactados.
3. Como validar rapidamente.
4. Qual risco residual existe, se houver.

## 5. Regras de deploy

- Se a mudanca impactar deploy, build, variavel de ambiente ou runtime, revisar DEPLOY.md.
- Nao assumir comandos de deploy diferentes dos documentados sem registrar ajuste.