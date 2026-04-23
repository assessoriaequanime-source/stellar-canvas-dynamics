const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const initialSupply = process.env.INITIAL_SUPPLY_WEI || "1000000000000000000000000000";
  const rewardDistributor = process.env.REWARD_DISTRIBUTOR_ADDRESS || deployer.address;

  console.log("Deploying Module 3 contracts with:", deployer.address);
  console.log("Treasury:", treasury);

  const SGLToken = await hre.ethers.getContractFactory("SGLToken");
  const sglToken = await SGLToken.deploy(treasury, initialSupply);
  await sglToken.waitForDeployment();

  const tokenAddress = await sglToken.getAddress();

  const EscrowContract = await hre.ethers.getContractFactory("EscrowContract");
  const escrow = await EscrowContract.deploy(tokenAddress, deployer.address);
  await escrow.waitForDeployment();

  const FeeManager = await hre.ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(tokenAddress, treasury, 300, 200);
  await feeManager.waitForDeployment();

  const StakingPool = await hre.ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(tokenAddress, tokenAddress, deployer.address, rewardDistributor);
  await stakingPool.waitForDeployment();

  console.log("SGLToken:", tokenAddress);
  console.log("EscrowContract:", await escrow.getAddress());
  console.log("FeeManager:", await feeManager.getAddress());
  console.log("StakingPool:", await stakingPool.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});