# Viabilidade - Expansao de Interacao com Avatares

Status: aprovado para expansao incremental.

## Objetivos desta fase

0. Declarar modelo nativo de baixo custo como padrao operacional (Ollama na VPS).
1. Preparar suporte para voz mais sentimental com ElevenLabs.
2. Preparar suporte para integracao via API propria do usuario (LLM/TTS custom).
3. Nao alterar comportamento atual em producao.

## Viabilidade tecnica

### 1) ElevenLabs (voz sentimental)

Viavel. O backend atual ja suporta chamadas HTTP e autenticacao por chave.

Pontos de atencao:
- custo por caractere/audio
- latencia de resposta de TTS
- controle de consentimento para uso de voz
- cache de audio para reduzir custo

### 2) API propria do usuario (modelo custom)

Viavel. Arquitetura com provider custom permite:
- endpoint por tenant
- headers por tenant
- chave de API por tenant
- fallback para provider padrao

Pontos de atencao:
- validacao de endpoint e timeout
- observabilidade por tenant
- isolamento de dados e logs

### 3) Modelo nativo (baixo custo) - Ollama

Viavel e recomendado como default para reduzir atrito e custo operacional.

Diretriz:
- manter modelo nativo ativo por padrao
- usar premium/terceirizados como opcao por plano
- preservar fallback nativo para continuidade
- manter escolha direta de modelo pelo usuario desabilitada ate contratacao de provedores premium

Pendencia:
- avaliar modelo nativo superior (qualidade x custo x latencia) como ajuste fino posterior
- habilitar escolha de modelo pelo usuario somente apos contratacao, homologacao e governanca de custo/compliance

## Estrutura criada

- src/integrations/avatar-interaction/contracts
- src/integrations/avatar-interaction/providers/llm
- src/integrations/avatar-interaction/providers/voice
- src/integrations/avatar-interaction/registry
- src/integrations/avatar-interaction/application

## Proximo passo sugerido (fase de ativacao)

1. Criar tabela de configuracao por tenant para provider e credenciais.
2. Criar endpoint interno para registrar provider por tenant.
3. Integrar orquestrador na rota de avatar message.
4. Retornar payload com text + audio.
5. Ativar feature flags por tenant para rollout seguro.
