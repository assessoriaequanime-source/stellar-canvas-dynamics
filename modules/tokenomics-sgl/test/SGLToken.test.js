// test/SGLToken.test.js
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("SGLToken", function () {
  let admin, minter, pauser, user;
  let sglToken;

  beforeEach(async function () {
    [admin, minter, pauser, user] = await ethers.getSigners();
    const SGLToken = await ethers.getContractFactory("SGLToken");
    sglToken = await SGLToken.deploy(admin.address, ethers.parseEther("1000000"));
  });

  describe("Deployment", function () {
    it("deve atribuir roles corretas no deploy", async function () {
      const MINTER_ROLE = await sglToken.MINTER_ROLE();
      const PAUSER_ROLE = await sglToken.PAUSER_ROLE();
      expect(await sglToken.hasRole(MINTER_ROLE, admin.address)).to.be.true;
      expect(await sglToken.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
    });

    it("deve ter symbol SGL e 18 decimais", async function () {
      expect(await sglToken.symbol()).to.equal("SGL");
      expect(await sglToken.decimals()).to.equal(18);
    });
  });

  describe("Mint", function () {
    it("MINTER_ROLE deve conseguir mintar", async function () {
      await sglToken.connect(admin).mint(user.address, ethers.parseEther("100"));
      expect(await sglToken.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    });

    it("não-MINTER deve falhar ao tentar mintar", async function () {
      await expect(
        sglToken.connect(user).mint(user.address, ethers.parseEther("1"))
      ).to.be.reverted;
    });
  });

  describe("Pause", function () {
    it("PAUSER_ROLE deve pausar e bloquear transferências", async function () {
      await sglToken.connect(admin).mint(user.address, ethers.parseEther("10"));
      await sglToken.connect(admin).pause();
      await expect(
        sglToken.connect(user).transfer(admin.address, ethers.parseEther("1"))
      ).to.be.reverted;
    });

    it("unpause deve restaurar transferências", async function () {
      await sglToken.connect(admin).mint(user.address, ethers.parseEther("10"));
      await sglToken.connect(admin).pause();
      await sglToken.connect(admin).unpause();
      await expect(
        sglToken.connect(user).transfer(admin.address, ethers.parseEther("1"))
      ).to.not.be.reverted;
    });
  });

  describe("Burn", function () {
    it("holder deve conseguir burnar seus tokens", async function () {
      await sglToken.connect(admin).mint(user.address, ethers.parseEther("50"));
      await sglToken.connect(user).burn(ethers.parseEther("10"));
      expect(await sglToken.balanceOf(user.address)).to.equal(ethers.parseEther("40"));
    });
  });
});

describe("StakingPool", function () {
  let admin, staker;
  let sglToken, stakingPool;

  beforeEach(async function () {
    [admin, staker] = await ethers.getSigners();
    const SGLToken = await ethers.getContractFactory("SGLToken");
    sglToken = await SGLToken.deploy(admin.address, ethers.parseEther("1000000"));

    const StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await StakingPool.deploy(
      await sglToken.getAddress(),
      await sglToken.getAddress(),
      admin.address,
      admin.address
    );

    // Mint e approve
    await sglToken.mint(staker.address, ethers.parseEther("1000"));
    await sglToken.connect(staker).approve(await stakingPool.getAddress(), ethers.parseEther("1000"));
    // Funding de rewards
    await sglToken.mint(await stakingPool.getAddress(), ethers.parseEther("10000"));
  });

  it("deve permitir stake e registrar posição", async function () {
    await stakingPool.connect(staker).stake(ethers.parseEther("100"));
    expect(await stakingPool.balances(staker.address)).to.equal(ethers.parseEther("100"));
  });

  it("deve rejeitar stake de 0", async function () {
    await expect(stakingPool.connect(staker).stake(0)).to.be.reverted;
  });

  it("deve permitir withdraw após stake", async function () {
    await stakingPool.connect(staker).stake(ethers.parseEther("50"));
    await stakingPool.connect(staker).withdraw(ethers.parseEther("50"));
    expect(await stakingPool.balances(staker.address)).to.equal(0);
  });
});
