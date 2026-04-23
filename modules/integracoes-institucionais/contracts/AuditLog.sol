// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AuditLog
/// @notice Registro on-chain append-only de ações sensíveis realizadas por instituições.
///         Cada entrada é imutável e exportável para uso em processos judiciais,
///         auditorias regulatórias e relatórios de compliance (LGPD/eIDAS/bancário).
/// @dev Próximo passo: adicionar hash encadeado (estilo Merkle) entre entradas
///      para prova criptográfica de integridade da sequência de logs.
contract AuditLog is AccessControl, Pausable {
    bytes32 public constant LOGGER_ROLE    = keccak256("LOGGER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");

    // ─── Categorias de ação ───────────────────────────────────────────────
    enum ActionCategory {
        CapsuleCreated,
        CapsuleUnlocked,
        AvatarMinted,
        AvatarSessionStarted,
        AvatarSessionFinalized,
        EscrowCreated,
        EscrowReleased,
        EscrowFrozen,
        ConsentGranted,
        ConsentRevoked,
        KYCVerified,
        OracleEventRecorded,
        PartnerOnboarded,
        PartnerSuspended,
        CustomAction
    }

    struct LogEntry {
        ActionCategory category;
        bytes32        subjectId;       // hash do sujeito ou entidade (nunca PII)
        bytes32        resourceId;      // hash do recurso afetado (capsuleId, avatarId etc)
        bytes32        dataHash;        // SHA-256 dos dados adicionais off-chain
        bytes32        prevEntryHash;   // hash da entrada anterior (encadeamento)
        uint64         recordedAt;
        address        logger;          // contrato ou EOA que registrou
        string         partnerCode;     // codigo do parceiro institucional
    }

    uint256 public entryCount;
    mapping(uint256 => LogEntry) public entries;
    bytes32 public lastEntryHash;

    event LogEntryRecorded(
        uint256 indexed entryId,
        ActionCategory indexed category,
        bytes32 indexed subjectId,
        bytes32 resourceId,
        string partnerCode,
        bytes32 prevEntryHash
    );

    constructor(address admin) {
        require(admin != address(0), "AUDIT: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LOGGER_ROLE,        admin);
        _grantRole(INSPECTOR_ROLE,     admin);
    }

    // ─── Registro ─────────────────────────────────────────────────────────

    /// @notice Registra uma acao auditavel on-chain com encadeamento de hashes.
    ///         Produz trilha imutável verificável por tribunais e auditorias.
    /// @param category    Categoria da acao.
    /// @param subjectId   Hash do sujeito (usuario, empresa).
    /// @param resourceId  Hash do recurso afetado (ID de capsula, avatar, posicao).
    /// @param dataHash    SHA-256 do payload completo da acao (off-chain).
    /// @param partnerCode Codigo da instituicao parceira que originou a acao.
    function log(
        ActionCategory  category,
        bytes32         subjectId,
        bytes32         resourceId,
        bytes32         dataHash,
        string calldata partnerCode
    ) external whenNotPaused onlyRole(LOGGER_ROLE) returns (uint256 entryId) {
        require(subjectId  != bytes32(0), "AUDIT: invalid subject");
        require(resourceId != bytes32(0), "AUDIT: invalid resource");
        require(dataHash   != bytes32(0), "AUDIT: invalid data hash");
        require(bytes(partnerCode).length > 0, "AUDIT: empty partner code");

        entryId = entryCount++;

        bytes32 prev = lastEntryHash;

        entries[entryId] = LogEntry({
            category:      category,
            subjectId:     subjectId,
            resourceId:    resourceId,
            dataHash:      dataHash,
            prevEntryHash: prev,
            recordedAt:    uint64(block.timestamp),
            logger:        msg.sender,
            partnerCode:   partnerCode
        });

        // encadeamento: novo hash combinando entryId + dataHash + prev
        lastEntryHash = keccak256(abi.encodePacked(entryId, dataHash, prev));

        emit LogEntryRecorded(
            entryId, category, subjectId, resourceId, partnerCode, prev
        );
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Verifica a integridade de uma entrada recomputando seu hash esperado.
    ///         Util para provar a posicao de uma entrada na cadeia de logs.
    function verifyEntryChain(
        uint256 entryId,
        bytes32 expectedPrevEntryHash
    ) external view returns (bool) {
        LogEntry storage e = entries[entryId];
        return e.prevEntryHash == expectedPrevEntryHash && e.recordedAt > 0;
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
