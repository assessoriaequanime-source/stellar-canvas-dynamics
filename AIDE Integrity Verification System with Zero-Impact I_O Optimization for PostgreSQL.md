Este documento detalha a implementação do sistema de verificação de integridade **AIDE (Advanced Intrusion Detection Environment)** otimizado para ambientes de alta densidade de escrita e restrição de I/O, especificamente projetado para coexistir com instâncias PostgreSQL e grandes volumes de arquivos (`node_modules`).

### Análise de Design: Estratégia de Impacto Zero

A implementação utiliza uma abordagem de **"Gatekeeper de I/O"**. Antes de iniciar o processo de hashing (que é intensivo em leitura), o script interroga o kernel sobre o estado atual de espera de entrada/saída (`iowait`). Se o sistema estiver processando transações pesadas de banco de dados no momento, o script aborta silenciosamente para preservar a latência da aplicação principal.

#### Matriz de Priorização
| Recurso | Ferramenta | Nível de Prioridade | Impacto Esperado |
| :--- | :--- | :--- | :--- |
| **CPU** | `nice -n 19` | Mínima (Lowest) | AIDE usará apenas ciclos de CPU ociosos. |
| **I/O** | `ionice -c 3` | "Idle" (Ocioso) | O processo só lerá do disco se nenhum outro processo solicitar I/O. |
| **Monitoramento** | `iostat` | Pré-verificação | Garante que a execução não inicie durante picos de carga. |

---

### 1. Implementação do Script: `aide-stealth-check.sh`

O script abaixo deve ser salvo em `/usr/local/bin/aide-stealth-check.sh` e possuir permissões de execução (`chmod +x`).

```bash
#!/bin/bash
# ==============================================================================
# Script: aide-stealth-check.sh
# Descrição: Verificação de integridade AIDE com impacto zero no PostgreSQL.
# Prioridade: CPU (Nice 19), I/O (Ionice Idle).
# ==============================================================================

# Configurações
LOG_DIR="/tmp/aide_reports"
LOG_FILE="$LOG_DIR/aide_check_$(date +%Y%m%d_%H%M).log"
IOWAIT_THRESHOLD=5.0  # Limite máximo de iowait para permitir o início
CONFIG_FILE="/etc/aide/aide.conf"

# Criar diretório de logs se não existir
mkdir -p "$LOG_DIR"

# 1. Verificação de Pré-requisitos (iostat)
if ! command -v iostat &> /dev/null; then
    echo "[$(date)] ERROR: 'sysstat' não instalado. Abortando." >> "$LOG_FILE"
    exit 1
fi

# 2. Verificação de Carga de I/O (iowait)
# Captura a média de iowait do segundo reporte do iostat (mais preciso que o primeiro)
CURRENT_IOWAIT=$(iostat -c 1 2 | awk '/avg-cpu:/ {getline; print $4}' | tail -n 1 | tr ',' '.')

# Comparação lógica para garantir que o sistema não está sob estresse
if (( $(echo "$CURRENT_IOWAIT > $IOWAIT_THRESHOLD" | bc -l) )); then
    echo "[$(date)] SKIPPED: I/O Wait muito alto ($CURRENT_IOWAIT%). Preservando performance do banco." >> "$LOG_FILE"
    exit 0
fi

# 3. Execução Silenciosa com Prioridade Mínima
echo "[$(date)] START: Iniciando verificação AIDE (Nice 19, Ionice Idle)..." >> "$LOG_FILE"

# nice -n 19: Prioridade de CPU mais baixa
# ionice -c 3: Classe 'Idle' - só processa se o disco estiver livre
nice -n 19 ionice -c 3 aide --check --config "$CONFIG_FILE" >> "$LOG_FILE" 2>&1

# 4. Compactação e Limpeza
# Mantém os logs pequenos e rotaciona via compactação simples
gzip -f "$LOG_FILE"

# Remover logs com mais de 7 dias para economizar espaço (considerando os 82% de uso atual)
find "$LOG_DIR" -name "*.log.gz" -mtime +7 -delete

exit 0
```

---

### 2. Configuração de Exclusões (`aide.conf`)

Para garantir que o AIDE não escaneie diretórios voláteis do PostgreSQL ou pastas massivas de desenvolvimento, certifique-se de que as seguintes linhas existam no seu `/etc/aide/aide.conf`:

```text
# Exclusões Críticas para Performance e Estabilidade
!/var/lib/postgresql/.*          # Dados do Banco (Escrita constante)
!/var/log/postgresql/.*         # Logs do Postgres
!.*node_modules/.*              # Dependências Node (Milhares de arquivos pequenos)
!/tmp/.*                        # Arquivos temporários
!/var/tmp/.*                    # Arquivos temporários
!/root/logs/.*                  # Logs customizados
```

---

### 3. Agendamento Crontab

Conforme a análise de ciclo de carga, o horário de **04:15 AM** foi selecionado para evitar colisões com backups da meia-noite e o início do expediente comercial.

Para instalar, execute `crontab -e` e adicione a linha ao final:

```cron
# Executa verificação de integridade stealth diariamente às 04:15 AM
15 4 * * * /usr/local/bin/aide-stealth-check.sh > /dev/null 2>&1
```

---

### 4. Considerações Estratégicas e Riscos

#### Por que `ionice -c 3`?
Em sistemas com **82% de ocupação de disco**, a fragmentação é alta. O `ionice -c 3` impede que o AIDE entre na fila de busca do disco enquanto o PostgreSQL estiver tentando realizar um *checkpoint* ou gravar no WAL (Write-Ahead Log). Se o banco solicitar o disco, o AIDE é pausado instantaneamente pelo escalonador do kernel.

#### Métricas de Sucesso
*   **Impacto no Banco:** O `iowait` durante a execução não deve exceder significativamente a média normal do sistema.
*   **Integridade:** O arquivo `.log.gz` em `/tmp/aide_reports/` deve ser gerado diariamente, mesmo que vazio (indicando sucesso na verificação).
*   **Recuperação:** Em caso de lentidão crítica percebida pelo monitoramento, o script pode ser interrompido com um `kill` sem risco de corrupção de dados, pois o AIDE opera em modo somente-leitura (`--check`).

> **Nota:** Certifique-se de que o pacote `bc` e `sysstat` estejam instalados: `apt-get install bc sysstat`.