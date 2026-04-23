# Minuta - Contrato de Aquisicao de Plano IA

Status: rascunho operacional para negociacao e validacao juridica.

## 1. Partes

- Contratante: SingulAI.
- Contratada: Empresa provedora de IA (LLM, TTS ou multimodal).

## 2. Objeto

A contratada fornece planos de uso de IA para consumo pela SingulAI, com possibilidade de exposicao controlada ao usuario final para escolha de modelo, conforme politicas da plataforma.

## 3. Escopo Tecnico Minimo

1. API estavel com autenticacao segura.
2. Definicao formal de modelos disponiveis por plano.
3. Metricas de uso e faturamento auditaveis.
4. SLA de disponibilidade, latencia e suporte.
5. Politica de versionamento e deprecacao de modelos.

## 4. Governanca de Modelos

1. A SingulAI pode habilitar/desabilitar modelos por tenant, plano e jurisdicao.
2. O usuario final pode escolher modelo apenas entre opcoes aprovadas pela SingulAI.
3. Modelos bloqueados por risco, compliance ou custo nao podem ser expostos ao usuario.
4. A SingulAI pode forcar fallback para modelo seguro em caso de incidente.

## 5. Seguranca, Privacidade e Compliance

1. Tratamento de dados conforme LGPD/GDPR e normas aplicaveis.
2. Minimizacao de dados: enviar ao provedor somente o necessario para inferencia.
3. Proibicao de uso dos dados da SingulAI para treino sem autorizacao expressa.
4. Trilhas de auditoria obrigatorias para requisicoes, erros e alteracoes de configuracao.
5. Mecanismo de exclusao e retencao conforme politica contratual.

## 6. Conteudo e Uso Etico

1. O provedor deve oferecer controles de seguranca para conteudo proibido.
2. A camada de seguranca da SingulAI permanece obrigatoria e prevalece sobre preferencias do usuario.
3. Casos criticos (autoagressao, violencia, fraude, terrorismo) devem seguir protocolo de bloqueio e escalonamento.

## 7. Financeiro e Licenciamento

1. Modelo de cobranca definido por unidade de consumo (tokens, caracteres, segundos de audio ou equivalente).
2. Tabela de preco por modelo e por plano.
3. Regras de reajuste, franquia e excedente.
4. Politica de credito, estorno e contestacao.

## 8. SLA e Suporte

1. SLA minimo de disponibilidade mensal.
2. Tempo maximo de resposta para incidentes criticos.
3. Janela e antecedencia para manutencao programada.
4. Matriz de escalonamento tecnico e executivo.

## 9. Continuidade e Saida

1. Plano de continuidade para indisponibilidade do provedor.
2. Portabilidade de configuracoes de modelo e politicas.
3. Procedimento de encerramento com prazo para migracao segura.

## 10. Anexos Recomendados

- Anexo A: Catalogo de modelos e limites por plano.
- Anexo B: Matriz de risco e classificacao de uso.
- Anexo C: Politica de seguranca e resposta a incidentes.
- Anexo D: DPA (Data Processing Addendum).

## 11. Clausula de Hierarquia de Regras

Para uso na plataforma SingulAI, prevalece a seguinte hierarquia:

1. Lei e regulacao aplicavel.
2. Contrato 0 da SingulAI e politicas globais de seguranca.
3. Contrato comercial com o provedor.
4. Preferencias do usuario final.

## 12. Estrategia de Modelo Nativo da SingulAI

1. A SingulAI adotara um modelo nativo de baixo custo como camada padrao de operacao.
2. No estado atual, a operacao nativa e prevista via Ollama em infraestrutura propria (VPS).
3. Modelos premium/terceirizados poderao ser habilitados por plano e governanca, sem substituir a camada nativa obrigatoria de continuidade.
4. A escolha de modelo pelo usuario final deve respeitar o catalogo homologado e as politicas de seguranca da plataforma.
5. A avaliacao de um modelo nativo superior permanece como pendencia de ajuste fino tecnico e economico.

## 13. Observacao

Este documento e uma base tecnica-operacional e deve passar por revisao juridica antes de assinatura.
