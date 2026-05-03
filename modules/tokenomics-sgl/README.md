# Modulo 3 - Tokenomics SGL

Subprojeto isolado para o esqueleto financeiro da SingulAI, pronto para expandir com Hardhat sem interferir no frontend principal.

## Estrutura

- `contracts/SGLToken.sol`: token ERC-20 base com burn, pause e roles.
- `contracts/EscrowContract.sol`: bloqueio de SGL para capsulas e legados.
- `contracts/FeeManager.sol`: taxas on-chain com split treasury + burn.
- `contracts/StakingPool.sol`: staking pool inicial com reward distribution.
- `scripts/deploy-sepolia.js`: deploy baseline para Sepolia.
- `docs/Modulo3_SGL_Roadmap.md`: outline do slide deck para investidores/parceiros.

## Setup rapido

1. Copie `.env.example` para `.env`.
2. Instale dependencias:

```bash
npm install
```

3. Compile:

```bash
npm run compile
```

4. Deploy baseline em Sepolia:

```bash
npm run deploy:sepolia
```

## Decisoes de seguranca no stub

- Controles de acesso via `AccessControl`.
- Fluxos pausaveis para resposta operacional.
- `SafeERC20` para movimentacao de SGL.
- `ReentrancyGuard` em fluxos sensiveis de escrow e staking.
- Comentarios claros de extensao para multisig, oraculos e AvatarPro.

## Proximos passos recomendados

1. Adicionar multisig para treasury e roles criticas.
2. Integrar oraculos Chainlink para gatilhos e keepers.
3. Conectar FeeManager e Escrow a eventos do AvatarPro/Guardiao.
4. Adicionar testes unitarios e testes de invariantes.
5. Revisar compliance, KYC/AML e fiscalidade antes de qualquer deploy publico.