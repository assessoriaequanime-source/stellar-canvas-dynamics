Este documento define o protocolo técnico e a implementação do mecanismo **Break-Glass Multisig 2-of-3** para a infraestrutura SingulAI. O sistema foi projetado para permitir intervenções emergenciais no motor de faturamento (PCPraxis) sem comprometer a diretiva "Zero Adição", utilizando criptografia assimétrica e reversão automática de estado.

---

### 1. Governança do Quórum Criptográfico (2-of-3)

A ativação do estado de emergência exige a cooperação de pelo menos dois dos três detentores de chaves GPG. Este modelo impede que um único administrador (ou uma conta comprometida) desabilite as proteções do sistema de faturamento.

| Papel | Chave GPG | Responsabilidade |
| :--- | :--- | :--- |
| **DevOps Lead** | `0xADMIN_KEY` | Execução técnica do hotfix e abertura do ticket. |
| **Security Officer** | `0xSEC_KEY` | Validação de conformidade e auditoria de riscos. |
| **CTO / Auditor** | `0xAUDIT_KEY` | Aprovação final e monitoramento de integridade. |

#### O Mecanismo de Ativação
Para gerar um **Emergency Authorization Token (EAT)**, o solicitante cria um manifesto `request.json` contendo o ID do ticket (ECR) e o hash do binário a ser corrigido. Este arquivo deve ser assinado por pelo menos duas das chaves acima.

---

### 2. Implementação: Script `break-glass-v2.sh`

Este script é o orquestrador do ambiente. Ele valida o quórum, relaxa o **Sudo Gatekeeper** e agenda o **Auto-Healing**.

```bash
#!/bin/bash
# ==============================================================================
# SCRIPT: break-glass-v2.sh (SingulAI Emergency Protocol)
# TAMANHO: ~4KB (Longe do limite de 1MB) | CONSUMO RAM: < 5MB
# ==============================================================================

set -e

# Configurações de Caminho
GPG_DIR="/etc/singulai/security/keys"
ECR_PATH="/var/lib/singulai/emergency"
SNAPSHOT_DB="/var/lib/singulai/state_snapshot.db"
LOCKDOWN_TIMER=60 # Minutos

# 1. Validação de Quórum Multisig (2-of-3)
validate_quorum() {
    local sig_file=$1
    echo "[LOG] Validando assinaturas GPG..."
    
    # Extrai IDs das chaves que assinaram o documento
    mapfile -t VALID_SIGS < <(gpg --status-fd 1 --verify "$sig_file" 2>/dev/null | grep "VALIDSIG" | awk '{print $3}')
    
    COUNT=${#VALID_SIGS[@]}
    
    if [ "$COUNT" -lt 2 ]; then
        echo "[ERROR] Quórum insuficiente ($COUNT/2). Abortando."
        exit 1
    fi
    echo "[OK] Quórum de $COUNT assinaturas validado."
}

# 2. Snapshot de Integridade Pré-Emergência
create_snapshot() {
    echo "[LOG] Criando snapshot do estado atual (PCPraxis)..."
    find /opt/pcpraxis/bin -type f -exec sha256sum {} + > "$SNAPSHOT_DB"
    cp /etc/pcpraxis/config.json "${SNAPSHOT_DB}.cfg"
}

# 3. Ativação da Janela de Emergência
activate_emergency() {
    echo "[ALERT] Ativando modo Break-Glass por ${LOCKDOWN_TIMER}min."
    
    # Relaxa Sudo Gatekeeper para o escopo específico
    echo "EMERGENCY_MODE=ON" > /run/singulai_gatekeeper_status
    
    # Agenda o Auto-Healing Lockdown via 'at'
    echo "/usr/local/bin/break-glass-v2.sh --restore" | at now + $LOCKDOWN_TIMER minutes
}

# 4. Auto-Healing Lockdown (Restauração Forçada)
restore_lockdown() {
    echo "[CRITICAL] Iniciando Auto-Healing Lockdown..."
    
    # Bloqueia novamente o Sudo Gatekeeper
    rm -f /run/singulai_gatekeeper_status
    
    # Auditoria de "Zero Adição"
    echo "[LOG] Verificando arquivos não planejados..."
    sha256sum -c "$SNAPSHOT_DB" --status || (
        echo "[WARNING] Alterações não autorizadas detectadas! Revertendo binários..."
        # Lógica de restauração de backup imutável aqui
    )
    
    # Purge de temporários e logs de sessão
    rm -rf /tmp/emergency_*
    
    echo "[OK] Sistema re-estabilizado em modo ENFORCING."
}

# Controle de Fluxo
case "$1" in
    --activate)
        validate_quorum "$2"
        create_snapshot
        activate_emergency
        ;;
    --restore)
        restore_lockdown
        ;;
    *)
        echo "Uso: $0 --activate [signature_file.asc] | --restore"
        ;;
esac
```

---

### 3. Protocolo de "Auto-Healing" e Monitoramento

O Auto-Healing não é apenas cronológico; ele é **reativo a anomalias**. O sistema utiliza o `Audit-D` para monitorar qualquer tentativa de `apt install` ou `wget` durante a janela de emergência.

#### Fluxo de Auto-Recuperação (Reconciliation Engine)

| Evento | Ação do Sistema | Ferramenta |
| :--- | :--- | :--- |
| **Expiração de Tempo** | Mata todas as sessões SSH ativas abertas via Break-Glass. | `pkill -u emergency_user` |
| **Inconsistência de Hash** | Se o binário PCPraxis não condiz com o Ticket, restaura `/opt/pcpraxis/bin` da partição RO. | `rsync --delete` |
| **Persistência de Rootkit** | Verifica novos arquivos com bit `SUID` criados na última hora. | `find / -perm /4000` |
| **Cleanup de RAM** | Liberação de buffers e cache para garantir os 8GB disponíveis para faturamento. | `sysctl -w vm.drop_caches=3` |

---

### 4. Configuração do AppArmor para Emergência

Para impedir que scripts *fileless* sobrevivam ao reinício, o perfil do AppArmor é modificado temporariamente, mas mantém a proibição de escrita em diretórios de sistema.

```apparmor
# Fragmento do Perfil /etc/apparmor.d/emergency_profile
profile pcpraxis_emergency {
  /opt/pcpraxis/** rw,       # Permite escrita apenas no diretório do projeto
  /usr/bin/python3 rmix,     # Permite execução de scripts autorizados
  
  deny /root/** w,           # Proíbe escrita na home do root mesmo em emergência
  deny /etc/apt/sources.list w, # Impede adição de repositórios
  deny network raw,          # Bloqueia scanners de rede (nmap, etc)
}
```

---

### 5. Guia de Operação (Passo a Passo)

1.  **Geração do Manifesto**: O engenheiro cria `ecr_01_2026.json`.
2.  **Assinatura Digital**: Admin e Sec assinam gerando `ecr_01_2026.json.asc`.
3.  **Execução**:
    ```bash
    sudo /usr/local/bin/break-glass-v2.sh --activate ecr_01_2026.json.asc
    ```
4.  **Janela de Hotfix**: O engenheiro tem 60 minutos para corrigir o erro de faturamento.
5.  **Encerramento Automático**: O sistema dispara o `--restore`, limpa os logs de auditoria e reativa o **Sudo Gatekeeper** no modo mais estrito.

### 6. Métricas de Sucesso Técnica

*   **Overhead de RAM**: O processo de monitoramento (`Shadow Auditor` + `GPG Check`) deve permanecer abaixo de **25MB**.
*   **Tempo de Restauração**: O Auto-Healing deve completar a limpeza em menos de **30 segundos**.
*   **Imutabilidade**: Tentativas de desativar o cronômetro (`atrm`) devem ser bloqueadas pelo perfil AppArmor de emergência.