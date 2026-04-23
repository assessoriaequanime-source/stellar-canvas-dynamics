# SingulAI — Módulo 2: Avatares Evolutivos

Subprojeto Hardhat isolado com stubs Solidity seguros para o Módulo 2.  
Não interferem no frontend React/Vite do repositório principal.

## Contratos

| Contrato | Responsabilidade |
|---|---|
| `AvatarBase.sol` | ERC721 NFT com CID IPFS de snapshot. Minting, atualização e desativação auditáveis. |
| `AvatarWalletLink.sol` | Vincula carteiras a avatares com níveis de permissão e expiração. |
| `AvatarPro.sol` | Sessões pagas em SGL com limite diário e finalização auditável. |
| `ConsentRegistry.sol` | Consentimentos LGPD/GDPR com bitmask, trilha de revogação e hash de documento. |

## Dependências de outros módulos

- `AvatarPro` requer o `SGLToken` do **Módulo 3** já deployado.  
  Configure `SGL_TOKEN_ADDRESS` no `.env` antes de deployar `AvatarPro`.

## Setup

```bash
cp .env.example .env
# edite .env com suas chaves e endereços

npm install
npm run compile
```

## Deploy (Sepolia)

```bash
npm run deploy:sepolia
```

## Próximos passos após deploy

1. Conceder `MINTER_ROLE` ao backend em `AvatarBase`.
2. Conceder `LINKER_ROLE` ao backend em `AvatarWalletLink`.
3. Conceder `CONSENT_MANAGER_ROLE` ao backend em `ConsentRegistry`.
4. Conceder `SESSION_MANAGER_ROLE` e `PRICE_SETTER_ROLE` ao backend em `AvatarPro`.
5. Configurar serviços por avatar via `AvatarPro.configureService()`.

## Segurança

- Todos os contratos usam `AccessControl`, `Pausable` e quando relevante `ReentrancyGuard`.
- `AvatarBase` sobrescreve `_update` para bloquear transfers quando pausado.
- `ConsentRegistry` usa bitmask para eficiência de gas e clareza de auditoria.
- Dados sensíveis ficam **off-chain** (IPFS, Vector DB). On-chain apenas hashes/CIDs.
- Chave privada e endereços nunca devem ser commitados. Usar `.env` (gitignored).

## Vulnerabilidades conhecidas (audit backlog)

- `AvatarPro.requestSession` não verifica se o avatar está ativo — integrar `AvatarBase` como dependência.
- `ConsentRegistry` não bloqueia sessões em `AvatarPro` — integrar chamada `hasConsent` no `requestSession`.
- Falta de multisig para `DEFAULT_ADMIN_ROLE` — recomendado antes de mainnet.
