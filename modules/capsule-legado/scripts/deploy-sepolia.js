// scripts/deploy-sepolia.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ─── Configuração ─────────────────────────────────────────────────────
  // Endereços dos contratos dos módulos dependentes (preencher após deploy de M3 e M4)
  const SGL_TOKEN_ADDRESS     = process.env.SGL_TOKEN_ADDRESS     || ethers.ZeroAddress;
  const ORACLE_GATEWAY_ADDRESS = process.env.ORACLE_GATEWAY_ADDRESS || ethers.ZeroAddress;

  console.log("\n──────────────────────────────────────────────");
  console.log("Módulo 1 — Capsule do Legado");
  console.log("──────────────────────────────────────────────");

  if (SGL_TOKEN_ADDRESS === ethers.ZeroAddress) {
    console.warn("⚠  SGL_TOKEN_ADDRESS não configurado. Usando address(0) — atualize via setOracleGateway() após deploy.");
  }
  if (ORACLE_GATEWAY_ADDRESS === ethers.ZeroAddress) {
    console.warn("⚠  ORACLE_GATEWAY_ADDRESS não configurado. Capsulas OracleEvent não funcionarão até configuração.");
  }

  // ─── TimeCapsule ──────────────────────────────────────────────────────
  console.log("\n[1/2] Deployando TimeCapsule...");
  const TimeCapsule = await ethers.getContractFactory("TimeCapsule");
  const timeCapsule = await TimeCapsule.deploy(
    SGL_TOKEN_ADDRESS,
    ORACLE_GATEWAY_ADDRESS,
    deployer.address  // admin
  );
  await timeCapsule.waitForDeployment();
  const timeCapsuleAddress = await timeCapsule.getAddress();
  console.log("      TimeCapsule:", timeCapsuleAddress);

  // ─── LegacyPolicy ─────────────────────────────────────────────────────
  console.log("\n[2/2] Deployando LegacyPolicy...");
  const LegacyPolicy = await ethers.getContractFactory("LegacyPolicy");
  const legacyPolicy = await LegacyPolicy.deploy(
    deployer.address  // admin
  );
  await legacyPolicy.waitForDeployment();
  const legacyPolicyAddress = await legacyPolicy.getAddress();
  console.log("      LegacyPolicy:", legacyPolicyAddress);

  // ─── Resumo ───────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════");
  console.log("✅ Módulo 1 — Capsule do Legado deployado");
  console.log("══════════════════════════════════════════════");
  console.log("TimeCapsule  :", timeCapsuleAddress);
  console.log("LegacyPolicy :", legacyPolicyAddress);
  console.log("\nPróximos passos:");
  console.log("1. Se SGL_TOKEN_ADDRESS ou ORACLE_GATEWAY_ADDRESS eram address(0),");
  console.log("   configure-os via setOracleGateway() e um novo deploy ou upgrade.");
  console.log("2. Conceder EXECUTOR_ROLE e CURATOR_ROLE às carteiras de operação.");
  console.log("3. Conceder POLICY_MANAGER_ROLE à carteira de gestão de legado.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
