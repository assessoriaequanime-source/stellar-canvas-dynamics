const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const admin    = process.env.ADMIN_ADDRESS    || deployer.address;
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const sglToken = process.env.SGL_TOKEN_ADDRESS;

  console.log("Deploying Module 4 - Integracoes Institucionais com:", deployer.address);
  console.log("Admin:    ", admin);
  console.log("Treasury: ", treasury);

  // 1. WhiteLabelRegistry — deve ser o primeiro (outros contratos o consultam)
  const WhiteLabelRegistry = await hre.ethers.getContractFactory("WhiteLabelRegistry");
  const whiteLabelRegistry = await WhiteLabelRegistry.deploy(admin);
  await whiteLabelRegistry.waitForDeployment();
  const whiteLabel = await whiteLabelRegistry.getAddress();
  console.log("WhiteLabelRegistry: ", whiteLabel);

  // 2. OracleGateway — eventos oficiais que disparam execucoes
  const OracleGateway = await hre.ethers.getContractFactory("OracleGateway");
  const oracleGateway = await OracleGateway.deploy(admin);
  await oracleGateway.waitForDeployment();
  console.log("OracleGateway:      ", await oracleGateway.getAddress());

  // 3. AuditLog — registro append-only com encadeamento de hashes
  const AuditLog = await hre.ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(admin);
  await auditLog.waitForDeployment();
  console.log("AuditLog:           ", await auditLog.getAddress());

  // 4. InstitutionalEscrow — requer SGLToken do Modulo 3
  if (!sglToken) {
    console.warn(
      "\n[AVISO] SGL_TOKEN_ADDRESS nao configurado. " +
      "InstitutionalEscrow nao sera deployado. " +
      "Configure o endereco do SGLToken do Modulo 3 no .env e rode novamente.\n"
    );
  } else {
    const InstitutionalEscrow = await hre.ethers.getContractFactory("InstitutionalEscrow");
    const institutionalEscrow = await InstitutionalEscrow.deploy(sglToken, treasury, admin);
    await institutionalEscrow.waitForDeployment();
    console.log("InstitutionalEscrow:", await institutionalEscrow.getAddress());
  }

  console.log("\nDeploy do Modulo 4 concluido.");
  console.log("Proximos passos:");
  console.log("1. Registrar parceiros piloto no WhiteLabelRegistry");
  console.log("2. Conceder ORACLE_OPERATOR_ROLE ao backend no OracleGateway");
  console.log("3. Conceder LOGGER_ROLE ao backend e contratos no AuditLog");
  console.log("4. Conceder EXECUTOR_ROLE ao orquestrador no InstitutionalEscrow");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
