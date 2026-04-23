// test/TimeCapsule.test.js
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("TimeCapsule", function () {
  let admin, creator, beneficiary, curator, executor;
  let sglToken, oracleGateway, timeCapsule, legacyPolicy;

  // ─── Fixtures ──────────────────────────────────────────────────────────
  beforeEach(async function () {
    [admin, creator, beneficiary, curator, executor] = await ethers.getSigners();

    // Deploy mock ERC20 (SGL)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    sglToken = await MockERC20.deploy("SingulAI Token", "SGL", admin.address);

    // TimeCapsule com oracle address(0) (sem M4 disponível em unit tests)
    const TimeCapsule = await ethers.getContractFactory("TimeCapsule");
    timeCapsule = await TimeCapsule.deploy(
      await sglToken.getAddress(),
      ethers.ZeroAddress, // oracle não configurado
      admin.address
    );

    // LegacyPolicy
    const LegacyPolicy = await ethers.getContractFactory("LegacyPolicy");
    legacyPolicy = await LegacyPolicy.deploy(admin.address);

    // Configurar roles
    const EXECUTOR_ROLE = await timeCapsule.EXECUTOR_ROLE();
    await timeCapsule.connect(admin).grantRole(EXECUTOR_ROLE, executor.address);

    // Mint SGL para creator
    await sglToken.connect(admin).mint(creator.address, ethers.parseEther("1000"));
    await sglToken.connect(creator).approve(await timeCapsule.getAddress(), ethers.parseEther("1000"));
  });

  // ─── TimeCapsule ───────────────────────────────────────────────────────

  describe("createCapsule", function () {
    it("deve criar cápsula TimeLock sem SGL", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("legado-documento"));

      const tx = await timeCapsule.connect(creator).createCapsule(
        beneficiary.address,
        "QmTestCID123",
        0, // TriggerType.TimeLock
        unlockTime,
        ethers.ZeroHash,
        0,
        ethers.ZeroAddress,
        0, // sem SGL
        metadataHash
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(l => l.fragment?.name === "CapsuleCreated");
      expect(event).to.not.be.undefined;

      const capsule = await timeCapsule.capsules(0);
      expect(capsule.creator).to.equal(creator.address);
      expect(capsule.beneficiary).to.equal(beneficiary.address);
      expect(capsule.status).to.equal(0); // Active
    });

    it("deve criar cápsula TimeLock com SGL bloqueado", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("legado-com-sgl"));
      const sglAmount = ethers.parseEther("100");

      await timeCapsule.connect(creator).createCapsule(
        beneficiary.address,
        "QmTestCID456",
        0, // TimeLock
        unlockTime,
        ethers.ZeroHash,
        0,
        ethers.ZeroAddress,
        sglAmount,
        metadataHash
      );

      const balance = await sglToken.balanceOf(await timeCapsule.getAddress());
      expect(balance).to.equal(sglAmount);
    });

    it("deve rejeitar unlock time no passado", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 100;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("teste"));

      await expect(
        timeCapsule.connect(creator).createCapsule(
          beneficiary.address, "QmFail", 0, pastTime,
          ethers.ZeroHash, 0, ethers.ZeroAddress, 0, metadataHash
        )
      ).to.be.revertedWith("CAPSULE: unlock time in past");
    });

    it("deve rejeitar beneficiary address(0)", async function () {
      const metadata = ethers.keccak256(ethers.toUtf8Bytes("teste"));
      await expect(
        timeCapsule.connect(creator).createCapsule(
          ethers.ZeroAddress, "QmFail", 3, 0,
          ethers.ZeroHash, 0, ethers.ZeroAddress, 0, metadata
        )
      ).to.be.revertedWith("CAPSULE: invalid beneficiary");
    });
  });

  describe("cancelCapsule", function () {
    it("deve cancelar e devolver SGL ao creator", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const metadata = ethers.keccak256(ethers.toUtf8Bytes("cancel-test"));
      const sglAmount = ethers.parseEther("50");

      await timeCapsule.connect(creator).createCapsule(
        beneficiary.address, "QmCancel", 0, unlockTime,
        ethers.ZeroHash, 0, ethers.ZeroAddress, sglAmount, metadata
      );

      const balanceBefore = await sglToken.balanceOf(creator.address);
      await timeCapsule.connect(creator).cancelCapsule(0);
      const balanceAfter = await sglToken.balanceOf(creator.address);

      expect(balanceAfter - balanceBefore).to.equal(sglAmount);
      const capsule = await timeCapsule.capsules(0);
      expect(capsule.status).to.equal(2); // Cancelled
    });

    it("deve rejeitar cancelamento por não-criador", async function () {
      const unlockTime = Math.floor(Date.now() / 1000) + 3600;
      const metadata = ethers.keccak256(ethers.toUtf8Bytes("cancel-fail"));
      await timeCapsule.connect(creator).createCapsule(
        beneficiary.address, "QmFail", 0, unlockTime,
        ethers.ZeroHash, 0, ethers.ZeroAddress, 0, metadata
      );
      await expect(
        timeCapsule.connect(beneficiary).cancelCapsule(0)
      ).to.be.revertedWith("CAPSULE: not creator");
    });
  });

  describe("ManualCurator flow", function () {
    it("deve permitir unlock por curador + executor", async function () {
      const metadata = ethers.keccak256(ethers.toUtf8Bytes("curator-test"));
      const sglAmount = ethers.parseEther("20");

      await timeCapsule.connect(creator).createCapsule(
        beneficiary.address, "QmCurator", 2, 0,
        ethers.ZeroHash, 0, curator.address, sglAmount, metadata
      );

      await timeCapsule.connect(curator).approveByCurator(0);
      expect(await timeCapsule.curatorApproved(0)).to.be.true;

      const balBefore = await sglToken.balanceOf(beneficiary.address);
      await timeCapsule.connect(executor).executeApprovedCapsule(0);
      const balAfter = await sglToken.balanceOf(beneficiary.address);

      expect(balAfter - balBefore).to.equal(sglAmount);
      expect((await timeCapsule.capsules(0)).status).to.equal(1); // Unlocked
    });

    it("deve rejeitar executor sem aprovação do curador", async function () {
      const metadata = ethers.keccak256(ethers.toUtf8Bytes("no-approval"));
      await timeCapsule.connect(creator).createCapsule(
        beneficiary.address, "QmFail", 2, 0,
        ethers.ZeroHash, 0, curator.address, 0, metadata
      );
      await expect(
        timeCapsule.connect(executor).executeApprovedCapsule(0)
      ).to.be.revertedWith("CAPSULE: curator not approved");
    });
  });

  // ─── LegacyPolicy ──────────────────────────────────────────────────────

  describe("LegacyPolicy", function () {
    it("deve criar política com beneficiários e shares corretos", async function () {
      const tx = await legacyPolicy.connect(creator).createPolicy(
        "QmPolicyHash",
        [beneficiary.address, executor.address],
        [7000, 3000],  // 70% + 30% = 100%
        ["herdeiro", "conjuge"]
      );
      await tx.wait();

      const [pol_creator, , status] = await legacyPolicy.getPolicy(0);
      expect(pol_creator).to.equal(creator.address);
      expect(status).to.equal(0); // Draft

      const bens = await legacyPolicy.getBeneficiaries(0);
      expect(bens.length).to.equal(2);
      expect(bens[0].sharePercent).to.equal(7000);
    });

    it("deve rejeitar shares que não somam 10000", async function () {
      await expect(
        legacyPolicy.connect(creator).createPolicy(
          "QmFail",
          [beneficiary.address],
          [5000], // 50% ≠ 100%
          ["herdeiro"]
        )
      ).to.be.revertedWith("POLICY: shares must total 10000 bp");
    });

    it("deve ativar e executar política com POLICY_MANAGER_ROLE", async function () {
      await legacyPolicy.connect(creator).createPolicy(
        "QmOk",
        [beneficiary.address],
        [10000],
        ["herdeiro"]
      );
      await legacyPolicy.connect(admin).activatePolicy(0);
      let [, , status] = await legacyPolicy.getPolicy(0);
      expect(status).to.equal(1); // Active

      await legacyPolicy.connect(admin).executePolicy(0);
      [, , status] = await legacyPolicy.getPolicy(0);
      expect(status).to.equal(2); // Executed
    });
  });
});

// ─── Mock ERC20 mínimo para testes ────────────────────────────────────────
// Coloque em contracts/test/MockERC20.sol ou use um helper separado
