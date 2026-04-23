#!/usr/bin/env node
/**
 * deploy-all-sepolia.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Script de deploy unificado — SingulAI Platform (Sepolia Testnet)
 *
 * Ordem de deploy respeitando dependências entre módulos:
 *
 *  FASE 1 — Módulo 3 (Tokenomics SGL): base token, sem dependências externas
 *    1. SGLToken
 *    2. EscrowContract
 *    3. FeeManager
 *    4. StakingPool
 *
 *  FASE 2 — Módulo 1 (Capsule do Legado): depende de SGLToken
 *    5. TimeCapsule
 *    6. LegacyPolicy
 *
 *  FASE 3 — Módulo 2 (Avatares Evolutivos): depende de SGLToken
 *    7. AvatarBase
 *    8. AvatarWalletLink
 *    9. ConsentRegistry
 *   10. AvatarPro  ← depende de SGLToken + ConsentRegistry
 *
 *  FASE 4 — Módulo 4 (Integrações Institucionais): depende de SGLToken
 *   11. WhiteLabelRegistry
 *   12. OracleGateway        ← configurar WhiteLabelRegistry após deploy
 *   13. AuditLog
 *   14. InstitutionalEscrow  ← depende de SGLToken + OracleGateway
 *
 *  PÓS-DEPLOY — Wiring cross-módulo:
 *   - TimeCapsule.setOracleGateway(OracleGateway)
 *   - AvatarPro.setConsentRegistry(ConsentRegistry)
 *   - OracleGateway.setWhiteLabelRegistry(WhiteLabelRegistry)
 *   - InstitutionalEscrow.setOracleGateway(OracleGateway)
 *
 * Uso:
 *   cd modules
 *   DEPLOYER_KEY=0x... node deploy-all-sepolia.js
 *
 * Dependência: Cada submodulo deve estar compilado (npx hardhat compile).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { ethers } = require("ethers");
const path       = require("path");
const fs         = require("fs");

const RPC_URL        = process.env.SEPOLIA_RPC_URL    || "";
const DEPLOYER_KEY   = process.env.DEPLOYER_PRIVATE_KEY || "";
const ADMIN_ADDRESS  = process.env.ADMIN_ADDRESS       || "";

if (!RPC_URL || !DEPLOYER_KEY) {
  console.error("❌ Configure SEPOLIA_RPC_URL e DEPLOYER_PRIVATE_KEY como variáveis de ambiente.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const deployer  = new ethers.Wallet(DEPLOYER_KEY, provider);
const admin     = ADMIN_ADDRESS || deployer.address;

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadArtifact(moduleName, contractName) {
  const artifactPath = path.join(
    __dirname,
    moduleName,
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact não encontrado: ${artifactPath}\nCompile o módulo primeiro.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function deployContract(moduleName, contractName, args, label) {
  const artifact = loadArtifact(moduleName, contractName);
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  console.log(`  ⏳ Deploy ${label || contractName}...`);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`  ✅ ${label || contractName}: ${address}`);
  return { contract, address };
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("════════════════════════════════════════════════");
  console.log("  SingulAI Platform — Deploy Unificado (Sepolia)");
  console.log("════════════════════════════════════════════════");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Admin    : ${admin}`);
  const bal = await provider.getBalance(deployer.address);
  console.log(`  Balance  : ${ethers.formatEther(bal)} ETH\n`);

  const addresses = {};

  // ══════════════════════════════════════════════
  // FASE 1 — Módulo 3: Tokenomics SGL
  // ══════════════════════════════════════════════
  console.log("\n── FASE 1: Tokenomics SGL ──────────────────────");

  const { address: sglTokenAddr } = await deployContract(
    "tokenomics-sgl", "SGLToken", [admin, admin, admin], "SGLToken"
  );
  addresses.SGLToken = sglTokenAddr;

  const { address: escrowAddr } = await deployContract(
    "tokenomics-sgl", "EscrowContract", [sglTokenAddr, admin], "EscrowContract"
  );
  addresses.EscrowContract = escrowAddr;

  const { address: feeManagerAddr } = await deployContract(
    "tokenomics-sgl", "FeeManager", [sglTokenAddr, admin, admin], "FeeManager"
  );
  addresses.FeeManager = feeManagerAddr;

  const { address: stakingAddr } = await deployContract(
    "tokenomics-sgl", "StakingPool", [sglTokenAddr, admin, ethers.parseEther("0.001")], "StakingPool"
  );
  addresses.StakingPool = stakingAddr;

  // ══════════════════════════════════════════════
  // FASE 2 — Módulo 1: Capsule do Legado
  // ══════════════════════════════════════════════
  console.log("\n── FASE 2: Capsule do Legado ───────────────────");

  // OracleGateway ainda não deployado — será configurado após FASE 4
  const { address: timeCapsuleAddr } = await deployContract(
    "capsule-legado", "TimeCapsule", [sglTokenAddr, ethers.ZeroAddress, admin], "TimeCapsule"
  );
  addresses.TimeCapsule = timeCapsuleAddr;

  const { address: legacyPolicyAddr } = await deployContract(
    "capsule-legado", "LegacyPolicy", [admin], "LegacyPolicy"
  );
  addresses.LegacyPolicy = legacyPolicyAddr;

  // ══════════════════════════════════════════════
  // FASE 3 — Módulo 2: Avatares Evolutivos
  // ══════════════════════════════════════════════
  console.log("\n── FASE 3: Avatares Evolutivos ─────────────────");

  const { address: avatarBaseAddr } = await deployContract(
    "avatares-evolutivos", "AvatarBase", [admin, admin], "AvatarBase"
  );
  addresses.AvatarBase = avatarBaseAddr;

  const { address: avatarWalletLinkAddr } = await deployContract(
    "avatares-evolutivos", "AvatarWalletLink", [admin], "AvatarWalletLink"
  );
  addresses.AvatarWalletLink = avatarWalletLinkAddr;

  const { address: consentRegistryAddr } = await deployContract(
    "avatares-evolutivos", "ConsentRegistry", [admin], "ConsentRegistry"
  );
  addresses.ConsentRegistry = consentRegistryAddr;

  // AvatarPro depende de SGLToken; ConsentRegistry será configurado via setConsentRegistry
  const { address: avatarProAddr } = await deployContract(
    "avatares-evolutivos", "AvatarPro", [sglTokenAddr, admin, admin], "AvatarPro"
  );
  addresses.AvatarPro = avatarProAddr;

  // ══════════════════════════════════════════════
  // FASE 4 — Módulo 4: Integrações Institucionais
  // ══════════════════════════════════════════════
  console.log("\n── FASE 4: Integrações Institucionais ──────────");

  const { address: whiteLabelAddr } = await deployContract(
    "integracoes-institucionais", "WhiteLabelRegistry", [admin], "WhiteLabelRegistry"
  );
  addresses.WhiteLabelRegistry = whiteLabelAddr;

  // OracleGateway sem WhiteLabelRegistry — será configurado no wiring
  const { address: oracleAddr } = await deployContract(
    "integracoes-institucionais", "OracleGateway", [admin], "OracleGateway"
  );
  addresses.OracleGateway = oracleAddr;

  const { address: auditLogAddr } = await deployContract(
    "integracoes-institucionais", "AuditLog", [admin], "AuditLog"
  );
  addresses.AuditLog = auditLogAddr;

  const { address: instEscrowAddr } = await deployContract(
    "integracoes-institucionais", "InstitutionalEscrow", [sglTokenAddr, admin, admin], "InstitutionalEscrow"
  );
  addresses.InstitutionalEscrow = instEscrowAddr;

  // ══════════════════════════════════════════════
  // PÓS-DEPLOY — Wiring cross-módulo
  // ══════════════════════════════════════════════
  console.log("\n── Wiring cross-módulo ─────────────────────────");

  const oracleArtifact = loadArtifact("integracoes-institucionais", "OracleGateway");
  const oracleContract = new ethers.Contract(oracleAddr, oracleArtifact.abi, deployer);

  console.log("  ⏳ OracleGateway.setWhiteLabelRegistry...");
  await (await oracleContract.setWhiteLabelRegistry(whiteLabelAddr)).wait();
  console.log("  ✅ OracleGateway ← WhiteLabelRegistry");

  const capsuleArtifact = loadArtifact("capsule-legado", "TimeCapsule");
  const capsuleContract = new ethers.Contract(timeCapsuleAddr, capsuleArtifact.abi, deployer);
  console.log("  ⏳ TimeCapsule.setOracleGateway...");
  await (await capsuleContract.setOracleGateway(oracleAddr)).wait();
  console.log("  ✅ TimeCapsule ← OracleGateway");

  const avatarProArtifact = loadArtifact("avatares-evolutivos", "AvatarPro");
  const avatarProContract = new ethers.Contract(avatarProAddr, avatarProArtifact.abi, deployer);
  console.log("  ⏳ AvatarPro.setConsentRegistry...");
  await (await avatarProContract.setConsentRegistry(consentRegistryAddr)).wait();
  console.log("  ✅ AvatarPro ← ConsentRegistry");

  const instEscrowArtifact = loadArtifact("integracoes-institucionais", "InstitutionalEscrow");
  const instEscrowContract = new ethers.Contract(instEscrowAddr, instEscrowArtifact.abi, deployer);
  console.log("  ⏳ InstitutionalEscrow.setOracleGateway...");
  await (await instEscrowContract.setOracleGateway(oracleAddr)).wait();
  console.log("  ✅ InstitutionalEscrow ← OracleGateway");

  // ══════════════════════════════════════════════
  // RESUMO FINAL
  // ══════════════════════════════════════════════
  console.log("\n════════════════════════════════════════════════");
  console.log("  ✅ Deploy completo — SingulAI Platform");
  console.log("════════════════════════════════════════════════\n");

  const summary = {
    network:   "sepolia",
    deployedAt: new Date().toISOString(),
    deployer:   deployer.address,
    admin,
    contracts: addresses,
  };

  const outputPath = path.join(__dirname, "deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`  📄 Endereços salvos em: ${outputPath}\n`);

  console.log("Contratos deployados:");
  for (const [name, addr] of Object.entries(addresses)) {
    console.log(`  ${name.padEnd(22)}: ${addr}`);
  }

  console.log("\nPróximos passos pós-deploy:");
  console.log("  1. Conceder MINTER_ROLE ao contrato de staking se aplicável.");
  console.log("  2. Registrar parceiros no WhiteLabelRegistry via REGISTRAR_ROLE.");
  console.log("  3. Configurar ORACLE_OPERATOR_ROLE para operadores de eventos.");
  console.log("  4. Configurar POLICY_MANAGER_ROLE para gestores de legado.");
  console.log("  5. Verificar contratos no Etherscan com npx hardhat verify.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
