<think>
**Evaluating the Constraints**

I'm focused on the user's need to avoid interruptions. My analysis highlights that adding unplanned items is off the table, and they need to optimize current resources. The goal is clear: Maintain zero downtime while maximizing efficiency, not upgrading. It seems a delicate balance is required.


**Pinpointing Key Variables**

I'm now dissecting the core elements. I've broken down the system's starting state, identifying the critical components: total RAM, the active workloads (Postgres and Node.js/React builds), the pre-existing fragmentation, and the disk pressure.  I'm focusing on "page allocation stalls" as a key factor.


**Defining the Model's Scope**

I'm starting to build out the mathematical model. I've focused on the Buddy System and fragmentation, framing a "Fragmentation Index" to quantify memory trapped in low-order blocks. My core equation will evaluate latency, including a "stall duration" component that I'll try to relate to memory compaction.  I also see that the recent disk cleanup will influence I/O.


**Refining the Model's Scope**

I'm now iterating on the mathematical framework. I've formulated the core "Stall Equation", linking latency to base latency and stall duration. The next step is to refine how to compute $T_{stall}$, which hinges on the fragmentation index and also workload characteristics. Furthermore, I intend to model the interaction of the recent disk cleanup, the `vm.compact_memory` and hugepages.


**Refining the Model's Scope**

I'm now iterating on the mathematical framework. I've formulated the core "Stall Equation", linking latency to base latency and stall duration. The next step is to refine how to compute $T_{stall}$, which hinges on the fragmentation index and also workload characteristics. Furthermore, I intend to model the interaction of the recent disk cleanup, the `vm.compact_memory` and hugepages.


**Formulating the Recommendation**

I'm now consolidating the solution, considering the user's constraints. I'm leaning against Hugepages, given the memory-intensive React builds. The focus is now tuning `vm.compact_memory` and emphasizing opportunistic compaction *before* builds, rather than on-demand compaction. I'll highlight that the recent disk cleanup indirectly improves latency.


**Refining the Solution**

I'm now prioritizing the final recommendation, using all available information. The React build's unpredictable memory use means that Hugepages are not a good fit, given the limited 8GB memory. I'm focusing on "opportunistic compaction," which can be triggered before builds, not during the build processes. I'm using the 5GB cleanup to illustrate the indirect positive effect on latency.



</think>
Esta análise lógica simula o comportamento da memória no seu ambiente de produção atual (VPS 8GB), respeitando estritamente a restrição de **não interromper o trabalho em curso** e **não adicionar novos recursos**, focando puramente na otimização dos recursos existentes via *kernel tuning*.

### 1. Definição do Cenário e Variáveis de Estado

Para modelar matematicamente, definimos o estado atual da VPS ($S_{vps}$):

*   **$M_{total}$ (Memória Total):** $8192$ MB.
*   **$M_{used}$ (Em Uso):** ~64% (5.2 GB) para processos ativos (Postgres, Node.js/SingulAI, Docker).
*   **$M_{cache}$ (Page Cache):** Variável crítica. O Linux usa a RAM livre para cachear disco. Com builds React (altamente intensivos em I/O de arquivos pequenos) e Postgres (dependente de cache de leitura), há uma competição feroz por este espaço.
*   **$D_{io}$ (Pressão de Disco):** 82% ocupado. Embora 5GB de índices tenham sido limpos (reduzindo IOPS de escrita), a leitura sequencial ainda sofre se houver *swapping*.

---

### 2. Modelagem da Fragmentação (O Sistema "Buddy")

O kernel Linux gerencia memória através do **Buddy Allocator**, que agrupa páginas em blocos de ordem $n$ ($2^n \times 4KB$).

*   **O Problema (Builds React):** O Webpack/Vite e o compilador Node.js frequentemente requisitam alocações de **Alta Ordem** (blocos contíguos maiores que 4KB) para arrays e objetos grandes durante a transpilação.
*   **A Fragmentação Externa ($F_{ext}$):**
    $$F_{ext} = 1 - \frac{\text{Soma dos blocos livres de ordem máxima}}{\text{Total de memória livre}}$$
    
    Em uma VPS rodando há dias com cargas mistas (Banco de Dados + Builds), $F_{ext}$ tende a ser alto. Existem páginas livres, mas elas estão espalhadas (fragmentadas).

#### A Falha de Alocação (Allocation Stall)
Quando o processo `node` pede um bloco de ordem 3 (32KB contíguos) e o Buddy Allocator só tem páginas de ordem 0 (4KB) separadas:
1.  O Kernel entra em **Direct Compaction** ou **Direct Reclaim**.
2.  A CPU para o que está fazendo para reorganizar a RAM (mover dados de lugar).

---

### 3. Simulação de Latência no Faturamento

Definimos a latência total de uma transação de faturamento ($L_{fat}$) como:

$$L_{fat} = T_{net} + T_{app} + T_{db} + T_{stall}$$

Onde a meta é $L_{fat} < 150ms$.

*   **Cenário Normal:** $T_{db}$ (Postgres) é baixo (<5ms) pois os dados "quentes" estão no Page Cache.
*   **Cenário de Estresse (Build Rodando):**
    1.  O Build força alocação de memória.
    2.  O Kernel detecta fragmentação.
    3.  **Evento $T_{stall}$:** O Kernel bloqueia alocações por, digamos, 80ms para compactar memória.
    4.  Simultaneamente, para criar espaço para o Build, o Kernel despeja o Page Cache do Postgres.
    5.  A query de faturamento chega. O dado não está mais na RAM.
    6.  **Penalidade de I/O:** O Postgres precisa ler do disco (SSD saturado).
    
    $$L_{fat} = 20ms (net) + 10ms (app) + 120ms (Disk Read) + 80ms (CPU Stall)$$
    $$L_{fat} = 230ms$$
    
    **Resultado Lógico:** Violação da SLA (>150ms) e potencial timeout na API de pagamento.

---

### 4. Análise de Eficácia das Soluções (Sem Reinício)

Aqui analisamos as intervenções permitidas (sysctl em tempo de execução) para mitigar o problema sem parar o servidor.

#### A. Hugepages (Transparent Huge Pages - THP)
*   **Lógica:** Usar páginas de 2MB em vez de 4KB para reduzir a gestão da tabela de páginas.
*   **Análise para 8GB RAM:**
    *   **Risco:** O Postgres se beneficia, mas o Node.js/Builds reagem mal à fragmentação causada por THP em memórias < 16GB. O THP pode agravar o *stall* pois o kernel tenta desesperadamente encontrar blocos de 2MB contíguos.
    *   **Veredito:** **Desativar ou configurar como "madvise"**. Em 8GB compartilhado, THP forçado (`always`) é matematicamente desfavorável para a estabilidade sob estresse de builds.

#### B. `vm.compact_memory` (Compactação Manual)
*   **Lógica:** Forçar a desfragmentação escrevendo `1` em `/proc/sys/vm/compact_memory`.
*   **Custo:** Pico de CPU de 100% por 1-2 segundos.
*   **Estratégia:** Útil se executado *preventivamente* (antes do build), desastroso se executado *durante* o faturamento. Não é uma solução automática viável sem orquestração.

#### C. `vm.min_free_kbytes` (A Chave de Ouro)
Esta é a variável mais crítica para evitar o *Direct Reclaim*. Ela define a "reserva de emergência" que o kernel mantém livre.
*   **Valor Padrão (Geralmente):** Muito baixo (~64MB).
*   **Simulação com Aumento:** Se aumentarmos para ~5% da RAM (~400MB).
    *   O `kswapd` (processo de limpeza em background) acorda mais cedo, liberando memória *antes* que o Build cause um travamento (stall).
    *   Isso sacrifica um pouco de Page Cache, mas garante atomicidade na alocação.

---

### 5. Solução Lógica e Prescritiva

Para resolver a latência sem interromper o trabalho e sem custos extras, devemos alterar o comportamento do Kernel para priorizar a **latência sobre a taxa de transferência** durante a fragmentação.

Execute os seguintes ajustes de `sysctl` em tempo real (não requer reboot, aplicação imediata):

**Passo 1: Aumentar a reserva de memória (Evitar Stalls)**
Aumentar a margem de segurança obriga o kernel a limpar a memória inativa *antes* do pico de demanda do Build, evitando que o faturamento espere pela limpeza.
```bash
# Aumenta reserva para ~256MB (Valor seguro para 8GB RAM)
# Reduz drasticamente a chance de "Direct Reclaim" bloqueante
sysctl -w vm.min_free_kbytes=262144
```

**Passo 2: Ajustar a agressividade do Swap e Cache (Proteger o Postgres)**
Como você tem 82% de disco, queremos evitar *swapping* agressivo, mas precisamos permitir que o kernel limpe o cache de arquivos (inode cache) dos builds antigos para dar lugar ao Postgres.
```bash
# Reduz a tendência de usar Swap (foco em manter dados na RAM)
sysctl -w vm.swappiness=10

# Aumenta a preferência por manter dentry/inode cache (estrutura de arquivos)
# em detrimento do Page Cache de dados brutos. Ajuda em builds com muitos arquivos pequenos.
sysctl -w vm.vfs_cache_pressure=50
```

**Passo 3: Compactação Oportunista**
Em vez de forçar compactação (que trava a CPU), instruímos o kernel a compactar proativamente quando possível.
```bash
sysctl -w vm.compaction_proactiveness=20
```

### Conclusão Matemática da Intervenção

Ao aplicar `vm.min_free_kbytes=262144`:
1.  O sistema começa a liberar memória quando atingir 7.75GB de uso, não 7.95GB.
2.  **Ganho:** O tempo de alocação ($T_{stall}$) tende a zero para o processo do Build, pois haverá blocos livres pré-preparados pelo `kswapd` em background.
3.  **Resultado no Faturamento:** A probabilidade de latência $>150ms$ cai drasticamente, pois a CPU não é sequestrada para compactação de memória no momento crítico da requisição HTTP.

**Ação Imediata:** Aplique os comandos `sysctl` acima. Eles são seguros, não interrompem serviços e resolvem o gargalo de alocação modelado.