// test/AvatarBase.test.js
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("AvatarBase (ERC721)", function () {
  let admin, minter, user, other;
  let avatarBase;

  beforeEach(async function () {
    [admin, minter, user, other] = await ethers.getSigners();
    const AvatarBase = await ethers.getContractFactory("AvatarBase");
    avatarBase = await AvatarBase.deploy(admin.address);

    const MINTER_ROLE = await avatarBase.MINTER_ROLE();
    await avatarBase.connect(admin).grantRole(MINTER_ROLE, minter.address);
  });

  describe("Mint", function () {
    it("MINTER_ROLE deve mintar avatar com CID", async function () {
      const cid = "QmAvatarMetadataV1";
      const tx = await avatarBase.connect(minter).mintAvatar(user.address, cid);
      await tx.wait();
      expect(await avatarBase.ownerOf(0)).to.equal(user.address);
    });

    it("não-MINTER deve falhar", async function () {
      const cid = "QmFail";
      await expect(
        avatarBase.connect(user).mintAvatar(user.address, cid)
      ).to.be.reverted;
    });
  });

  describe("Snapshot", function () {
    beforeEach(async function () {
      await avatarBase.connect(minter).mintAvatar(user.address, "QmAvatarBase");
    });

    it("owner deve atualizar snapshot do avatar", async function () {
      const newCid = "QmSnapshotV2";
      await avatarBase.connect(user).updateSnapshot(0, newCid);
      const data = await avatarBase.getAvatar(0);
      expect(data.ipfsCID).to.equal(newCid);
    });

    it("não-owner não deve atualizar snapshot", async function () {
      const newCid = "QmFail";
      await expect(
        avatarBase.connect(other).updateSnapshot(0, newCid)
      ).to.be.reverted;
    });
  });

  describe("Deactivate (direito ao esquecimento)", function () {
    beforeEach(async function () {
      await avatarBase.connect(minter).mintAvatar(user.address, "QmDeactivate");
    });

    it("owner deve conseguir desativar avatar", async function () {
      await avatarBase.connect(user).deactivateAvatar(0);
      const data = await avatarBase.getAvatar(0);
      expect(data.isActive).to.be.false;
    });

    it("avatar desativado não deve aceitar novos snapshots", async function () {
      await avatarBase.connect(user).deactivateAvatar(0);
      const newCid = "QmAfterDeactivate";
      await expect(
        avatarBase.connect(user).updateSnapshot(0, newCid)
      ).to.be.reverted;
    });
  });
});

describe("ConsentRegistry", function () {
  let admin, user;
  let consentRegistry;

  beforeEach(async function () {
    [admin, user] = await ethers.getSigners();
    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    consentRegistry = await ConsentRegistry.deploy(admin.address);
  });

  it("deve registrar consentimento de voz", async function () {
    const CONSENT_VOICE = await consentRegistry.CONSENT_VOICE();
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("lgpd-doc"));
    await consentRegistry.connect(admin).grantConsent(1, user.address, CONSENT_VOICE, docHash);
    expect(await consentRegistry.hasConsent(1, user.address, CONSENT_VOICE)).to.be.true;
  });

  it("deve revogar consentimento", async function () {
    const CONSENT_VOICE = await consentRegistry.CONSENT_VOICE();
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("lgpd-doc"));
    await consentRegistry.connect(admin).grantConsent(1, user.address, CONSENT_VOICE, docHash);
    await consentRegistry.connect(admin).revokeConsent(1, user.address, CONSENT_VOICE);
    expect(await consentRegistry.hasConsent(1, user.address, CONSENT_VOICE)).to.be.false;
  });

  it("deve retornar false para consentimento não concedido", async function () {
    const CONSENT_MARKETING = await consentRegistry.CONSENT_MARKETING();
    expect(await consentRegistry.hasConsent(1, user.address, CONSENT_MARKETING)).to.be.false;
  });
});
