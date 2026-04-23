# SingulAI — Módulos Smart Contracts

Estrutura de contratos da plataforma SingulAI. Cada módulo é um projeto Hardhat isolado, compilável e deployável de forma independente.

---

## Arquitetura de Dependências

```
Módulo 3 (Tokenomics SGL)             ← base de valor, sem dependências externas
       │
       ├── Módulo 1 (Capsule do Legado)        ← usa SGLToken + OracleGateway
       │
       ├── Módulo 2 (Avatares Evolutivos)      ← usa SGLToken + ConsentRegistry
       │
       └── Módulo 4 (Integrações Institucionais) ← usa SGLToken; OracleGateway
                                                   referencia WhiteLabelRegistry
```

### Integrações Cross-Módulo (on-chain)

| Contrato              | Chama                         | Guarda                                                    |
|-----------------------|-------------------------------|-----------------------------------------------------------|
| `AvatarPro`           | `ConsentRegistry.hasConsent`  | sessões bloqueadas sem consentimento LGPD (voz)           |
| `OracleGateway`       | `WhiteLabelRegistry.isActive` | eventos bloqueados para parceiros não ativos              |
| `InstitutionalEscrow` | `OracleGateway.hasValidEvent` | releases bloqueados sem evento oracle confirmado          |
| `TimeCapsule`         | `OracleGateway.hasValidEvent` | unlock bloqueado sem evento oracle (TriggerType.OracleEvent) |

---

## Módulos

### Módulo 1 — Capsule do Legado (`capsule-legado/`)

**Produto**: Cápsulas de legado digital com conteúdo IPFS e desbloqueio condicional.

| Contrato       | Descrição                                                                    |
|----------------|------------------------------------------------------------------------------|
| `TimeCapsule`  | Cria cápsulas com unlock por tempo, evento oracle ou curador designado       |
| `LegacyPolicy` | Política de herança digital com beneficiários, percentuais e cápsulas vinculadas |

**Dependências**: `SGLToken` (M3), `OracleGateway` (M4, configurável pós-deploy).

---

### Módulo 2 — Avatares Evolutivos (`avatares-evolutivos/`)

**Produto**: Avatares NFT com memória, links de carteira, sessões pagas e consentimento LGPD.

| Contrato           | Descrição                                                                |
|--------------------|--------------------------------------------------------------------------|
| `AvatarBase`       | ERC721 com snapshot de memória e direito ao esquecimento (deactivate)    |
| `AvatarWalletLink` | Vincula carteiras externas ao avatar com níveis de permissão e expiração |
| `ConsentRegistry`  | Registro LGPD/GDPR on-chain com bitmask de consentimentos                |
| `AvatarPro`        | Sessões pagas em SGL com verificação de consentimento e audit trail       |

**Dependências**: `SGLToken` (M3), `ConsentRegistry` (próprio módulo, `setConsentRegistry`).

---

### Módulo 3 — Tokenomics SGL (`tokenomics-sgl/`)

**Produto**: Token SGL (ERC20) com economia completa: staking, escrow e gerenciamento de taxas.

| Contrato        | Descrição                                                        |
|-----------------|------------------------------------------------------------------|
| `SGLToken`      | ERC20 + Burnable + AccessControl + Pausable; MINTER/PAUSER roles  |
| `EscrowContract`| Posições bloqueadas com metadataHash e tempo de liberação         |
| `FeeManager`    | Divisão de taxas entre treasury e burn com SafeERC20              |
| `StakingPool`   | Staking com rewards proporcionais ao tempo                        |

**Dependências**: nenhuma externa (base layer).

---

### Módulo 4 — Integrações Institucionais (`integracoes-institucionais/`)

**Produto**: Camada de confiança institucional: parceiros, eventos oracle, escrow e auditoria.

| Contrato              | Descrição                                                                 |
|-----------------------|---------------------------------------------------------------------------|
| `WhiteLabelRegistry`  | Registro de parceiros (bancos, cartórios, seguradoras) com lifecycle/SLA  |
| `OracleGateway`       | Registro imutável de eventos oficiais (certidões, KYC, homologações)      |
| `InstitutionalEscrow` | Escrow oracle-triggered com verificação on-chain antes do release         |
| `AuditLog`            | Log append-only com hashes encadeados para exportação judicial            |

**Dependências**: `SGLToken` (M3); `OracleGateway` referencia `WhiteLabelRegistry` (próprio módulo).

---

## Ordem de Deploy para Sepolia

```
1.  SGLToken             (M3)
2.  EscrowContract       (M3)
3.  FeeManager           (M3)
4.  StakingPool          (M3)
5.  TimeCapsule          (M1 — oracle=address(0) inicialmente)
6.  LegacyPolicy         (M1)
7.  AvatarBase           (M2)
8.  AvatarWalletLink     (M2)
9.  ConsentRegistry      (M2)
10. AvatarPro            (M2 — sem ConsentRegistry inicialmente)
11. WhiteLabelRegistry   (M4)
12. OracleGateway        (M4 — sem WhiteLabel inicialmente)
13. AuditLog             (M4)
14. InstitutionalEscrow  (M4 — sem Oracle inicialmente)

── Wiring pós-deploy ──────────────────────────────────────
15. OracleGateway.setWhiteLabelRegistry(WhiteLabelRegistry)
16. TimeCapsule.setOracleGateway(OracleGateway)
17. AvatarPro.setConsentRegistry(ConsentRegistry)
18. InstitutionalEscrow.setOracleGateway(OracleGateway)
```

**Script unificado**: `modules/deploy-all-sepolia.js` executa tudo na ordem correta com wiring automático.

---

## Comandos por Módulo

```bash
# Instalar e compilar
cd modules/<nome-do-modulo>
npm install
npx hardhat compile

# Testes
npx hardhat test

# Deploy individual (Sepolia)
SEPOLIA_RPC_URL=... DEPLOYER_PRIVATE_KEY=... \
  npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

## Deploy Unificado

```bash
cd modules
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/KEY \
DEPLOYER_PRIVATE_KEY=0x... \
node deploy-all-sepolia.js
```

Requisito: todos os módulos compilados. Endereços salvos em `modules/deployed-addresses.json`.

---

## Checklist de Onboarding de Parceiros

- [ ] SGLToken deployado e endereço publicado
- [ ] WhiteLabelRegistry com parceiro registrado (`status = Active`)
- [ ] OracleGateway configurado com `whiteLabelRegistry`
- [ ] `ORACLE_OPERATOR_ROLE` concedido ao operador do parceiro
- [ ] Parceiro consegue chamar `recordEvent` com seu `institutionCode`
- [ ] InstitutionalEscrow configurado com `oracleGateway`
- [ ] TimeCapsule configurado com `oracleGateway`
- [ ] AvatarPro configurado com `consentRegistry`
- [ ] Contratos verificados no Etherscan Sepolia

---

## Ambiente Técnico

| Item         | Versão / Configuração           |
|--------------|---------------------------------|
| Solidity     | `0.8.24`                        |
| OpenZeppelin | `^5.2.0`                        |
| EVM target   | `cancun` (todos os módulos)     |
| Rede testnet | Sepolia                         |
| Hardhat      | `^2.22.0`                       |
