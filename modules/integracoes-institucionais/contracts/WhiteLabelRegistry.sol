// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title WhiteLabelRegistry
/// @notice Registro on-chain de parceiros institucionais autorizados (bancos, cartórios,
///         seguradoras, escritórios de advocacia) com SLA e controles de onboarding.
///         Serve como fonte de verdade para outros contratos validarem se um parceiro
///         está ativo antes de aceitar ações em nome dele.
/// @dev Próximo passo: vincular SLA on-chain com penalidades em SGL e integrar
///      KYC/AML do parceiro via OracleGateway antes de qualquer ativação.
contract WhiteLabelRegistry is AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE  = keccak256("REGISTRAR_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    enum PartnerType {
        Bank,           // Instituição bancária
        Cartorio,       // Cartório digital / notário
        Insurance,      // Seguradora
        LawFirm,        // Escritório de advocacia
        Government,     // Órgão governamental
        CustomPartner   // Parceiro customizado
    }

    enum PartnerStatus {
        Pending,    // aguardando aprovação de compliance
        Active,     // ativo e autorizado a operar
        Suspended,  // suspenso por violação de SLA ou compliance
        Revoked     // revogado permanentemente
    }

    enum SLALevel {
        Basic,      // SLA padrão
        Standard,   // SLA com suporte dedicado
        Enterprise  // SLA premium com penalidades contratuais
    }

    struct Partner {
        string      name;
        PartnerType partnerType;
        PartnerStatus status;
        SLALevel    slaLevel;
        bytes32     contractHash;   // hash do contrato SLA assinado off-chain
        bytes32     kycHash;        // hash do KYC/AML do parceiro verificado
        address     partnerWallet;  // carteira do parceiro para operacoes on-chain
        uint64      onboardedAt;
        uint64      lastUpdatedAt;
        string      jurisdictionCode; // codigo da jurisdicao (ex: "BR", "EU", "US")
    }

    // partnerCode => Partner
    mapping(string => Partner) private _partners;
    // partnerWallet => partnerCode (para lookup reverso)
    mapping(address => string) private _walletToCode;
    // lista de todos os codigos registrados
    string[] private _partnerCodes;

    event PartnerRegistered(
        string indexed partnerCode,
        string name,
        PartnerType partnerType,
        address partnerWallet,
        string jurisdictionCode
    );
    event PartnerActivated(
        string indexed partnerCode,
        address indexed operator,
        bytes32 kycHash
    );
    event PartnerSuspended(
        string indexed partnerCode,
        address indexed operator,
        string reason
    );
    event PartnerRevoked(
        string indexed partnerCode,
        address indexed operator,
        string reason
    );
    event PartnerSLAUpdated(
        string indexed partnerCode,
        SLALevel oldLevel,
        SLALevel newLevel,
        bytes32 newContractHash
    );

    constructor(address admin) {
        require(admin != address(0), "WL: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE,     admin);
        _grantRole(COMPLIANCE_ROLE,    admin);
    }

    // ─── Registro de parceiro ─────────────────────────────────────────────

    /// @notice Registra um novo parceiro institucional.
    ///         O status inicial é Pending; compliance deve ativar após KYC.
    function registerPartner(
        string calldata  partnerCode,
        string calldata  name,
        PartnerType      partnerType,
        SLALevel         slaLevel,
        bytes32          contractHash,
        address          partnerWallet,
        string calldata  jurisdictionCode
    ) external whenNotPaused onlyRole(REGISTRAR_ROLE) {
        require(bytes(partnerCode).length > 0,  "WL: empty code");
        require(bytes(name).length > 0,         "WL: empty name");
        require(contractHash != bytes32(0),     "WL: invalid contract hash");
        require(partnerWallet != address(0),    "WL: invalid wallet");
        require(bytes(jurisdictionCode).length > 0, "WL: empty jurisdiction");
        require(
            _partners[partnerCode].onboardedAt == 0,
            "WL: partner already registered"
        );
        require(
            bytes(_walletToCode[partnerWallet]).length == 0,
            "WL: wallet already linked"
        );

        _partners[partnerCode] = Partner({
            name:             name,
            partnerType:      partnerType,
            status:           PartnerStatus.Pending,
            slaLevel:         slaLevel,
            contractHash:     contractHash,
            kycHash:          bytes32(0),
            partnerWallet:    partnerWallet,
            onboardedAt:      uint64(block.timestamp),
            lastUpdatedAt:    uint64(block.timestamp),
            jurisdictionCode: jurisdictionCode
        });

        _walletToCode[partnerWallet] = partnerCode;
        _partnerCodes.push(partnerCode);

        emit PartnerRegistered(partnerCode, name, partnerType, partnerWallet, jurisdictionCode);
    }

    // ─── Lifecycle de compliance ──────────────────────────────────────────

    /// @notice Ativa um parceiro após KYC/AML aprovado.
    function activatePartner(
        string calldata partnerCode,
        bytes32         kycHash
    ) external onlyRole(COMPLIANCE_ROLE) {
        Partner storage p = _partners[partnerCode];
        require(p.onboardedAt > 0,                     "WL: not found");
        require(p.status == PartnerStatus.Pending,      "WL: not pending");
        require(kycHash != bytes32(0),                  "WL: invalid kyc hash");

        p.status        = PartnerStatus.Active;
        p.kycHash       = kycHash;
        p.lastUpdatedAt = uint64(block.timestamp);

        emit PartnerActivated(partnerCode, msg.sender, kycHash);
    }

    /// @notice Suspende um parceiro por violação de SLA ou compliance.
    function suspendPartner(
        string calldata partnerCode,
        string calldata reason
    ) external onlyRole(COMPLIANCE_ROLE) {
        Partner storage p = _partners[partnerCode];
        require(p.onboardedAt > 0,                 "WL: not found");
        require(p.status == PartnerStatus.Active,   "WL: not active");
        require(bytes(reason).length > 0,           "WL: reason required");

        p.status        = PartnerStatus.Suspended;
        p.lastUpdatedAt = uint64(block.timestamp);

        emit PartnerSuspended(partnerCode, msg.sender, reason);
    }

    /// @notice Revoga permanentemente um parceiro.
    function revokePartner(
        string calldata partnerCode,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Partner storage p = _partners[partnerCode];
        require(p.onboardedAt > 0,                       "WL: not found");
        require(p.status != PartnerStatus.Revoked,        "WL: already revoked");
        require(bytes(reason).length > 0,                 "WL: reason required");

        p.status        = PartnerStatus.Revoked;
        p.lastUpdatedAt = uint64(block.timestamp);

        emit PartnerRevoked(partnerCode, msg.sender, reason);
    }

    /// @notice Atualiza o SLA de um parceiro ativo com o hash do novo contrato.
    function updateSLA(
        string calldata partnerCode,
        SLALevel        newLevel,
        bytes32         newContractHash
    ) external onlyRole(REGISTRAR_ROLE) {
        Partner storage p = _partners[partnerCode];
        require(p.status == PartnerStatus.Active, "WL: not active");
        require(newContractHash != bytes32(0),    "WL: invalid hash");

        SLALevel old = p.slaLevel;
        p.slaLevel      = newLevel;
        p.contractHash  = newContractHash;
        p.lastUpdatedAt = uint64(block.timestamp);

        emit PartnerSLAUpdated(partnerCode, old, newLevel, newContractHash);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Verifica se um partnerCode está ativo.
    function isActive(string calldata partnerCode) external view returns (bool) {
        return _partners[partnerCode].status == PartnerStatus.Active;
    }

    /// @notice Retorna dados completos de um parceiro.
    function getPartner(string calldata partnerCode) external view returns (Partner memory) {
        return _partners[partnerCode];
    }

    /// @notice Resolve o partnerCode de uma carteira.
    function getPartnerCodeByWallet(address wallet) external view returns (string memory) {
        return _walletToCode[wallet];
    }

    /// @notice Retorna todos os códigos registrados.
    function getAllPartnerCodes() external view returns (string[] memory) {
        return _partnerCodes;
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
