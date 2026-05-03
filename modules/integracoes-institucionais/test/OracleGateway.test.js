// test/OracleGateway.test.js
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("OracleGateway", function () {
  let admin, operator, other;
  let oracleGateway;

  const SUBJECT_ID   = ethers.keccak256(ethers.toUtf8Bytes("CPF-123456789"));
  const DATA_HASH    = ethers.keccak256(ethers.toUtf8Bytes("documento-oficial"));
  const SIG_HASH     = ethers.keccak256(ethers.toUtf8Bytes("assinatura-icp"));
  const INSTITUTION  = "CARTORIO_SP_01";

  // EventType.DeathCertificate = 0
  const EVENT_DEATH  = 0;

  beforeEach(async function () {
    [admin, operator, other] = await ethers.getSigners();
    const OracleGateway = await ethers.getContractFactory("OracleGateway");
    oracleGateway = await OracleGateway.deploy(admin.address);

    // Conceder ORACLE_OPERATOR_ROLE ao operator
    const ROLE = await oracleGateway.ORACLE_OPERATOR_ROLE();
    await oracleGateway.connect(admin).grantRole(ROLE, operator.address);
  });

  describe("recordEvent", function () {
    it("operador deve registrar evento com sucesso", async function () {
      const tx = await oracleGateway.connect(operator).recordEvent(
        EVENT_DEATH, SUBJECT_ID, DATA_HASH, SIG_HASH, INSTITUTION
      );
      const receipt = await tx.wait();
      const ev = receipt.logs.find(l => l.fragment?.name === "OfficialEventRecorded");
      expect(ev).to.not.be.undefined;
      expect(await oracleGateway.eventCount()).to.equal(1);
    });

    it("não-operador deve ser rejeitado", async function () {
      await expect(
        oracleGateway.connect(other).recordEvent(
          EVENT_DEATH, SUBJECT_ID, DATA_HASH, SIG_HASH, INSTITUTION
        )
      ).to.be.reverted;
    });

    it("deve rejeitar subjectId vazio", async function () {
      await expect(
        oracleGateway.connect(operator).recordEvent(
          EVENT_DEATH, ethers.ZeroHash, DATA_HASH, SIG_HASH, INSTITUTION
        )
      ).to.be.revertedWith("ORACLE: invalid subject");
    });
  });

  describe("hasValidEvent", function () {
    beforeEach(async function () {
      await oracleGateway.connect(operator).recordEvent(
        EVENT_DEATH, SUBJECT_ID, DATA_HASH, SIG_HASH, INSTITUTION
      );
    });

    it("deve retornar true para evento registrado e válido", async function () {
      expect(await oracleGateway.hasValidEvent(SUBJECT_ID, EVENT_DEATH)).to.be.true;
    });

    it("deve retornar false para subjectId diferente", async function () {
      const OTHER_SUBJECT = ethers.keccak256(ethers.toUtf8Bytes("CPF-999"));
      expect(await oracleGateway.hasValidEvent(OTHER_SUBJECT, EVENT_DEATH)).to.be.false;
    });

    it("deve retornar false após invalidação do evento", async function () {
      await oracleGateway.connect(operator).invalidateEvent(0, "documento falsificado");
      expect(await oracleGateway.hasValidEvent(SUBJECT_ID, EVENT_DEATH)).to.be.false;
    });
  });

  describe("WhiteLabelRegistry guard", function () {
    it("sem registry configurado deve aceitar qualquer institution", async function () {
      // whiteLabelRegistry = address(0) por padrão → sem guard
      await expect(
        oracleGateway.connect(operator).recordEvent(
          EVENT_DEATH, SUBJECT_ID, DATA_HASH, SIG_HASH, "QUALQUER_PARCEIRO"
        )
      ).to.not.be.reverted;
    });
  });
});

describe("WhiteLabelRegistry", function () {
  let admin, registrar, compliance, partnerWallet;
  let registry;

  beforeEach(async function () {
    [admin, registrar, compliance, partnerWallet] = await ethers.getSigners();
    const WhiteLabelRegistry = await ethers.getContractFactory("WhiteLabelRegistry");
    registry = await WhiteLabelRegistry.deploy(admin.address);

    const REGISTRAR_ROLE  = await registry.REGISTRAR_ROLE();
    const COMPLIANCE_ROLE = await registry.COMPLIANCE_ROLE();
    await registry.connect(admin).grantRole(REGISTRAR_ROLE,  registrar.address);
    await registry.connect(admin).grantRole(COMPLIANCE_ROLE, compliance.address);
  });

  it("deve registrar parceiro em Pending", async function () {
    const contractHash = ethers.keccak256(ethers.toUtf8Bytes("sla-contrato"));

    await registry.connect(registrar).registerPartner(
      "CARTORIO_SP_01", "Cartório Digital SP", 2, // Cartorio
      0, // SLA Basic
      contractHash, partnerWallet.address, "BR"
    );

    expect(await registry.isActive("CARTORIO_SP_01")).to.be.false; // Pending ≠ Active
  });

  it("compliance deve ativar parceiro", async function () {
    const contractHash = ethers.keccak256(ethers.toUtf8Bytes("sla-contrato"));
    const kycHash      = ethers.keccak256(ethers.toUtf8Bytes("kyc-dados"));

    await registry.connect(registrar).registerPartner(
      "BANCO_XP", "Banco XP", 0, // Bank
      1, // Standard SLA
      contractHash, partnerWallet.address, "BR"
    );
    await registry.connect(compliance).activatePartner("BANCO_XP", kycHash);
    expect(await registry.isActive("BANCO_XP")).to.be.true;
  });

  it("deve rejeitar duplicata de partnerCode", async function () {
    const contractHash = ethers.keccak256(ethers.toUtf8Bytes("sla"));

    await registry.connect(registrar).registerPartner(
      "DUPLICATE", "Parceiro", 0, 0, contractHash, partnerWallet.address, "BR"
    );
    await expect(
      registry.connect(registrar).registerPartner(
        "DUPLICATE", "Outro", 0, 0, contractHash, partnerWallet.address, "BR"
      )
    ).to.be.reverted;
  });
});
