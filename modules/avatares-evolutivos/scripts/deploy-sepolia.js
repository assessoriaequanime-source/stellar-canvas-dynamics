const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const admin    = process.env.ADMIN_ADDRESS    || deployer.address;
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const sglToken = process.env.SGL_TOKEN_ADDRESS;

  console.log("Deploying Module 2 - Avatares Evolutivos com:", deployer.address);
  console.log("Admin:    ", admin);
  console.log("Treasury: ", treasury);

  // 1. AvatarBase (ERC721 NFT de avatar)
  const AvatarBase = await hre.ethers.getContractFactory("AvatarBase");
  const avatarBase = await AvatarBase.deploy(admin);
  await avatarBase.waitForDeployment();
  const avatarBaseAddress = await avatarBase.getAddress();
  console.log("AvatarBase:       ", avatarBaseAddress);

  // 2. AvatarWalletLink (vinculacao de carteiras)
  const AvatarWalletLink = await hre.ethers.getContractFactory("AvatarWalletLink");
  const avatarWalletLink = await AvatarWalletLink.deploy(admin);
  await avatarWalletLink.waitForDeployment();
  console.log("AvatarWalletLink: ", await avatarWalletLink.getAddress());

  // 3. ConsentRegistry (LGPD/GDPR on-chain)
  const ConsentRegistry = await hre.ethers.getContractFactory("ConsentRegistry");
  const consentRegistry = await ConsentRegistry.deploy(admin);
  await consentRegistry.waitForDeployment();
  console.log("ConsentRegistry:  ", await consentRegistry.getAddress());

  // 4. AvatarPro (sessoes pagas em SGL - requer Modulo 3 deployado)
  if (!sglToken) {
    console.warn(
      "\n[AVISO] SGL_TOKEN_ADDRESS nao configurado. " +
      "AvatarPro nao sera deployado. " +
      "Configure o endereco do SGLToken do Modulo 3 no .env e rode novamente.\n"
    );
  } else {
    const AvatarPro = await hre.ethers.getContractFactory("AvatarPro");
    const avatarPro = await AvatarPro.deploy(sglToken, treasury, admin);
    await avatarPro.waitForDeployment();
    console.log("AvatarPro:        ", await avatarPro.getAddress());
  }

  console.log("\nDeploy do Modulo 2 concluido.");
  console.log("Proximos passos:");
  console.log("1. Conceder MINTER_ROLE ao backend em AvatarBase");
  console.log("2. Conceder LINKER_ROLE ao backend em AvatarWalletLink");
  console.log("3. Conceder CONSENT_MANAGER_ROLE ao backend em ConsentRegistry");
  console.log("4. Configurar precos por avatar em AvatarPro via configureService()");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});