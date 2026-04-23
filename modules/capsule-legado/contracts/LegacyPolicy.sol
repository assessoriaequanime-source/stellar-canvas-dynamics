// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title LegacyPolicy
/// @notice Registro de políticas de herança digital on-chain.
///         Associa um criador a um conjunto de beneficiários com percentuais
///         de distribuição (basis points) e vincula cápsulas do TimeCapsule.
///         O documento de política completo permanece off-chain (IPFS CID / hash).
/// @dev Próximo passo: integrar com TimeCapsule para execução automatizada de
///      liquidação proporcional entre beneficiários.
contract LegacyPolicy is AccessControl {
    bytes32 public constant POLICY_MANAGER_ROLE = keccak256("POLICY_MANAGER_ROLE");

    // ─── Tipos ────────────────────────────────────────────────────────────
    enum PolicyStatus {
        Draft,      // criada, aguardando revisão
        Active,     // ativada pelo Policy Manager, pronta para uso
        Executed,   // executada após evento de legado
        Revoked     // revogada pelo criador ou gestor
    }

    struct Beneficiary {
        address wallet;
        uint16  sharePercent;  // basis points: 0–10000 (100% = 10000)
        string  role;          // ex: "herdeiro", "conjuge", "instituicao"
    }

    struct Policy {
        address       creator;
        string        policyHash;    // IPFS CID ou hash SHA-256 do documento off-chain
        Beneficiary[] beneficiaries;
        uint256[]     capsuleIds;    // IDs de cápsulas no TimeCapsule vinculadas
        PolicyStatus  status;
        uint64        createdAt;
        uint64        executedAt;
    }

    // ─── Estado ───────────────────────────────────────────────────────────
    uint256 public policyCount;

    mapping(uint256 => Policy) private _policies;
    mapping(address => uint256[]) public creatorPolicies; // criador => lista de policyIds

    // ─── Eventos ──────────────────────────────────────────────────────────
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed creator,
        string          policyHash
    );
    event PolicyActivated(
        uint256 indexed policyId,
        address indexed operator
    );
    event PolicyExecuted(
        uint256 indexed policyId,
        address indexed operator
    );
    event PolicyRevoked(
        uint256 indexed policyId,
        address indexed operator
    );
    event CapsuleLinked(
        uint256 indexed policyId,
        uint256 indexed capsuleId
    );

    // ─── Construtor ───────────────────────────────────────────────────────

    constructor(address admin) {
        require(admin != address(0), "POLICY: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE,  admin);
        _grantRole(POLICY_MANAGER_ROLE, admin);
    }

    // ─── Criação de política ──────────────────────────────────────────────

    /// @notice Cria uma política de legado com beneficiários e percentuais.
    /// @param policyHash   IPFS CID ou hash SHA-256 do documento de política off-chain.
    /// @param wallets      Carteiras dos beneficiários (mesma ordem que shares/roles).
    /// @param shares       Percentuais em basis points (soma deve ser exatamente 10000).
    /// @param roles        Função de cada beneficiário (ex: "herdeiro", "conjuge").
    function createPolicy(
        string   calldata  policyHash,
        address[] calldata wallets,
        uint16[]  calldata shares,
        string[]  calldata roles
    ) external returns (uint256 policyId) {
        require(bytes(policyHash).length > 0,                                "POLICY: empty hash");
        require(wallets.length == shares.length && wallets.length == roles.length, "POLICY: length mismatch");
        require(wallets.length > 0,                                          "POLICY: no beneficiaries");

        uint256 totalShares;
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        require(totalShares == 10000, "POLICY: shares must total 10000 bp");

        policyId = policyCount++;
        Policy storage policy = _policies[policyId];
        policy.creator    = msg.sender;
        policy.policyHash = policyHash;
        policy.status     = PolicyStatus.Draft;
        policy.createdAt  = uint64(block.timestamp);

        for (uint256 i = 0; i < wallets.length; i++) {
            require(wallets[i] != address(0), "POLICY: invalid wallet");
            policy.beneficiaries.push(Beneficiary({
                wallet:       wallets[i],
                sharePercent: shares[i],
                role:         roles[i]
            }));
        }

        creatorPolicies[msg.sender].push(policyId);
        emit PolicyCreated(policyId, msg.sender, policyHash);
    }

    // ─── Ciclo de vida ────────────────────────────────────────────────────

    /// @notice Ativa política em Draft. Apenas POLICY_MANAGER_ROLE.
    function activatePolicy(uint256 policyId) external onlyRole(POLICY_MANAGER_ROLE) {
        Policy storage policy = _policies[policyId];
        require(policy.status == PolicyStatus.Draft, "POLICY: not in draft");
        policy.status = PolicyStatus.Active;
        emit PolicyActivated(policyId, msg.sender);
    }

    /// @notice Vincula um TimeCapsule ID a esta política. Apenas POLICY_MANAGER_ROLE.
    function linkCapsule(uint256 policyId, uint256 capsuleId) external onlyRole(POLICY_MANAGER_ROLE) {
        Policy storage policy = _policies[policyId];
        require(policy.status == PolicyStatus.Active, "POLICY: not active");
        policy.capsuleIds.push(capsuleId);
        emit CapsuleLinked(policyId, capsuleId);
    }

    /// @notice Marca política como executada após ativação do legado.
    function executePolicy(uint256 policyId) external onlyRole(POLICY_MANAGER_ROLE) {
        Policy storage policy = _policies[policyId];
        require(policy.status == PolicyStatus.Active, "POLICY: not active");
        policy.status     = PolicyStatus.Executed;
        policy.executedAt = uint64(block.timestamp);
        emit PolicyExecuted(policyId, msg.sender);
    }

    /// @notice Revoga a política (criador ou POLICY_MANAGER_ROLE).
    function revokePolicy(uint256 policyId) external {
        Policy storage policy = _policies[policyId];
        require(
            msg.sender == policy.creator || hasRole(POLICY_MANAGER_ROLE, msg.sender),
            "POLICY: unauthorized"
        );
        require(policy.status != PolicyStatus.Executed, "POLICY: already executed");
        policy.status = PolicyStatus.Revoked;
        emit PolicyRevoked(policyId, msg.sender);
    }

    // ─── Consultas ────────────────────────────────────────────────────────

    function getPolicy(uint256 policyId)
        external view
        returns (
            address       creator,
            string memory policyHash,
            PolicyStatus  status,
            uint64        createdAt,
            uint64        executedAt
        )
    {
        Policy storage p = _policies[policyId];
        return (p.creator, p.policyHash, p.status, p.createdAt, p.executedAt);
    }

    function getBeneficiaries(uint256 policyId) external view returns (Beneficiary[] memory) {
        return _policies[policyId].beneficiaries;
    }

    function getCapsuleIds(uint256 policyId) external view returns (uint256[] memory) {
        return _policies[policyId].capsuleIds;
    }

    function getCreatorPolicies(address creator) external view returns (uint256[] memory) {
        return creatorPolicies[creator];
    }
}
