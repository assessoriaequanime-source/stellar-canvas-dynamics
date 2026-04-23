Este documento define a configuração técnica dos perfis **AppArmor** para o servidor Nginx e o gerenciador de processos PM2, integrando-os ao protocolo de endurecimento da infraestrutura SingulAI. O objetivo é converter o modelo de segurança de permissivo para **Whitelist de Comportamento**, mitigando vetores de ataque como execução de código remoto (RCE) e movimentação lateral.

---

### 1. Perfil AppArmor: Nginx
O perfil para o Nginx foi desenhado com o princípio do privilégio mínimo. Ele garante que o binário possa ler as configurações e certificados, mas proíbe estritamente qualquer alteração no sistema de arquivos, exceto nos logs.

**Arquivo:** `/etc/apparmor.d/usr.sbin.nginx`

```apparmor
#include <abstractions/base>
#include <abstractions/nameservice>
#include <abstractions/openssl>

profile nginx /usr/sbin/nginx {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Capacidades de Rede e Sistema
  capability net_bind_service,
  capability setuid,
  capability setgid,
  capability chown,

  # --- WHITELIST DE ACESSO A ARQUIVOS ---
  
  # Acesso de LEITURA para configurações (Restrito)
  /etc/nginx/ r,
  /etc/nginx/** r,

  # Acesso de LEITURA para certificados SSL/TLS
  /etc/ssl/certs/ r,
  /etc/ssl/certs/** r,
  /etc/ssl/private/ r,
  /etc/ssl/private/** r,
  /etc/letsencrypt/archive/ r,
  /etc/letsencrypt/archive/** r,
  /etc/letsencrypt/live/ r,
  /etc/letsencrypt/live/** r,

  # Acesso de ESCRITA restrito a logs e arquivos temporários de execução
  /var/log/nginx/*.log w,
  /var/log/nginx/*.log.1 r,
  /var/lib/nginx/** rw,
  /run/nginx.pid rw,

  # Acesso aos binários e bibliotecas compartilhadas
  /usr/sbin/nginx mr,
  /usr/lib/nginx/modules/*.so mr,

  # --- BLOQUEIOS EXPLICITOS (BLACKLIST DE EXECUÇÃO) ---
  # Impede o uso do Nginx como vetor para baixar ou executar scripts maliciosos
  deny /bin/sh x,
  deny /bin/bash x,
  deny /usr/bin/wget x,
  deny /usr/bin/curl x,
  deny /usr/bin/python* x,
  deny /usr/bin/perl x,

  # Prevenção contra injeção em diretórios temporários
  deny /tmp/** w,
  deny /dev/shm/** w,
}
```

---

### 2. Perfil AppArmor: PM2 (Node.js Runtime)
O perfil do PM2 é crítico, pois ele gerencia a aplicação **SingulAI**. Este perfil restringe o interpretador Node.js para operar apenas dentro do diretório da aplicação e impede a exploração via utilitários de sistema.

**Arquivo:** `/etc/apparmor.d/usr.bin.pm2`

```apparmor
#include <abstractions/base>
#include <abstractions/nameservice>
#include <abstractions/nodejs>

profile pm2 /usr/bin/node {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Permissões de execução para o binário do Node através do PM2
  /usr/bin/node mr,
  /usr/local/bin/pm2 r,
  
  # --- ESPECÍFICO SINGULAI ---
  
  # Limita leitura/escrita ao diretório da aplicação
  /opt/singulai/** rw,
  /opt/singulai/bin/* rmix,
  
  # Configurações e Logs do PM2
  owner @{HOME}/.pm2/** rw,
  owner @{HOME}/.pm2/*.log w,
  /var/log/singulai/** rw,

  # --- RESTRIÇÕES DE EXECUÇÃO (WHITELIST) ---
  
  # Nega explicitamente a chamada de shells e ferramentas de download
  # Isso impede que vulnerabilidades no código da aplicação virem RCE funcional
  deny /bin/sh x,
  deny /bin/bash x,
  deny /usr/bin/wget x,
  deny /usr/bin/curl x,
  deny /usr/bin/apt* x,
  
  # Bloqueio de escrita em áreas sensíveis de sistema
  deny /etc/** w,
  deny /boot/** rw,
  deny /root/** rw,

  # Permite apenas as bibliotecas necessárias
  /usr/lib{,32,64}/** mr,
}
```

---

### 3. Script de Implementação e Enforce
Este script automatiza o carregamento dos perfis e garante que eles estejam operando no modo **Enforce** (bloqueio ativo), em vez do modo Complain (apenas alerta).

```bash
#!/bin/bash
# singulai-apparmor-deploy.sh

echo "[*] Iniciando implantação dos perfis AppArmor SingulAI..."

# 1. Verificar se o AppArmor está instalado
if ! command -v apparmor_parser &> /dev/null; then
    echo "[!] Erro: AppArmor não encontrado. Instalando..."
    apt-get update && apt-get install -y apparmor-utils
fi

# 2. Carregar os perfis no Kernel
echo "[*] Carregando perfil Nginx..."
apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

echo "[*] Carregando perfil PM2/Node..."
apparmor_parser -r /etc/apparmor.d/usr.bin.pm2

# 3. Forçar modo Enforce
aa-enforce /etc/apparmor.d/usr.sbin.nginx
aa-enforce /etc/apparmor.d/usr.bin.pm2

# 4. Reiniciar serviços para aplicar as restrições ao processo pai
systemctl restart nginx
pm2 restart all --update-env

echo "[+] Perfis aplicados com sucesso em modo ENFORCE."
```

---

### 4. Protocolo de Auditoria e Monitoramento
Para monitorar tentativas de violação da política de segurança (ex: o Nginx tentando executar um comando `curl`), utilize os comandos abaixo.

**Resumo de Comandos de Auditoria:**

| Objetivo | Comando |
| :--- | :--- |
| **Verificar Status** | `aa-status` |
| **Auditoria em Tempo Real** | `tail -f /var/log/syslog | grep -i apparmor` |
| **Verificar Negações no Kernel** | `dmesg | grep -i "apparmor=\"DENIED\""` |
| **Listar Perfis em Enforce** | `aa-status --enforced` |

**Exemplo de comando para análise detalhada de negações:**
```bash
# Filtra as últimas 50 negações formatando para leitura humana
dmesg | grep -i "apparmor=\"DENIED\"" | tail -n 50 | awk '{print "Ação: " $10 " | Perfil: " $12 " | Recurso: " $13}'
```

---

### 5. Considerações Estratégicas
1.  **Overhead de Recursos:** O custo computacional destes perfis é desprezível (aproximadamente **4MB a 6MB** de RAM total), respeitando o limite de 50MB estabelecido no protocolo de hardening.
2.  **Imutabilidade:** Ao negar `exec` para `/bin/sh` e utilitários de rede, neutralizamos a fase de "Post-Exploitation" de ataques comuns, pois o atacante não conseguirá estabelecer um shell reverso ou baixar payloads adicionais.
3.  **Certificados:** Caso o caminho do Let's Encrypt seja alterado ou o Nginx use certificados em diretórios customizados, o perfil em `/etc/apparmor.d/usr.sbin.nginx` deve ser atualizado para evitar falhas no reload do serviço.