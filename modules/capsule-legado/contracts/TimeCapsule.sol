// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Interface mínima para consultar o OracleGateway do Módulo 4.
interface IOracleGateway {
    function hasValidEvent(bytes32 subjectId, uint8 eventType) external view returns (bool);
}

/// @title TimeCapsule
/// @notice Cápsula de legado digital: encapsula conteúdo (IPFS CID) com unlock
///         condicional por tempo, evento oracle (ex: certidão de óbito) ou
///         curador designado. Pode bloquear SGL para transferência ao beneficiário.
/// @dev Integra IOracleGateway (Módulo 4) para unlock baseado em evento registrado
///      on-chain. Endereço do oracle pode ser atualizado pelo admin para suportar
///      deploy faseado (M1 antes de M4).
contract TimeCapsule is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CURATOR_ROLE  = keccak256("CURATOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // ─── Tipos de gatilho ─────────────────────────────────────────────────
    enum TriggerType {
        TimeLock,       // liberar após timestamp específico
        OracleEvent,    // liberar quando OracleGateway confirma evento oficial
        ManualCurator,  // liberar mediante aprovação de curador designado
        Unrestricted    // cápsula pública, sem restrição de unlock
    }

    enum CapsuleStatus {
        Active,
        Unlocked,
        Cancelled
    }

    // ─── Estrutura de dados ───────────────────────────────────────────────
    struct Capsule {
        address      creator;
        address      beneficiary;
        string       contentCID;       // IPFS CID do conteúdo encriptado
        TriggerType  triggerType;
        uint64       unlockTime;       // para TriggerType.TimeLock (unix timestamp)
        bytes32      oracleSubjectId;  // hash do sujeito no OracleGateway (ex: hash do CPF)
        uint8        oracleEventType;  // EventType enum do OracleGateway (0=Óbito, etc.)
        address      curator;          // para TriggerType.ManualCurator
        uint256      sglLocked;        // SGL bloqueado nesta cápsula (pode ser zero)
        bytes32      metadataHash;     // hash do contrato/política de legado off-chain
        uint64       createdAt;
        uint64       unlockedAt;
        CapsuleStatus status;
    }

    // ─── Estado ───────────────────────────────────────────────────────────
    uint256 public  capsuleCount;
    IERC20  public  immutable sglToken;
    address public  oracleGateway;   // endereço do OracleGateway (Módulo 4)

    mapping(uint256 => Capsule) public capsules;
    mapping(uint256 => bool)    public curatorApproved; // capsuleId => curator aprovou

    // ─── Eventos ──────────────────────────────────────────────────────────
    event CapsuleCreated(
        uint256 indexed capsuleId,
        address indexed creator,
        address indexed beneficiary,
        TriggerType     triggerType,
        uint256         sglLocked,
        string          contentCID
    );
    event CapsuleUnlocked(
        uint256 indexed capsuleId,
        address indexed beneficiary,
        address indexed unlockedBy,
        uint256         sglReleased
    );
    event CapsuleCancelled(
        uint256 indexed capsuleId,
        address indexed cancelledBy
    );
    event CuratorApprovalGranted(
        uint256 indexed capsuleId,
        address indexed curator
    );
    event OracleGatewayUpdated(
        address indexed oldGateway,
        address indexed newGateway
    );

    // ─── Construtor ───────────────────────────────────────────────────────

    /// @param tokenAddress         Endereço do SGLToken (Módulo 3).
    /// @param oracleGatewayAddress Endereço do OracleGateway (Módulo 4). Pode ser address(0)
    ///                             inicialmente se M4 ainda não foi deployado.
    /// @param admin                Carteira administrativa.
    constructor(
        address tokenAddress,
        address oracleGatewayAddress,
        address admin
    ) {
        require(tokenAddress != address(0), "CAPSULE: invalid token");
        require(admin        != address(0), "CAPSULE: invalid admin");

        sglToken      = IERC20(tokenAddress);
        oracleGateway = oracleGatewayAddress; // pode receber address(0) e ser atualizado depois

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CURATOR_ROLE,       admin);
        _grantRole(EXECUTOR_ROLE,      admin);
    }

    // ─── Criação de cápsula ───────────────────────────────────────────────

    /// @notice Cria uma cápsula de legado digital com conteúdo off-chain encriptado.
    /// @param beneficiary      Quem receberá acesso/SGL ao unlock.
    /// @param contentCID       IPFS CID do conteúdo encriptado da cápsula.
    /// @param triggerType      Mecanismo de unlock.
    /// @param unlockTime       Timestamp Unix para TimeLock (ignorado para outros tipos).
    /// @param oracleSubjectId  Hash do CPF/CNPJ do sujeito para OracleEvent (ignorado para outros).
    /// @param oracleEventType  EventType do OracleGateway para OracleEvent (0=DeathCertificate).
    /// @param curator          Endereço do curador para ManualCurator (ignorado para outros).
    /// @param sglAmount        SGL a bloquear na cápsula (pode ser 0).
    /// @param metadataHash     Hash SHA-256 do contrato/política de legado off-chain.
    function createCapsule(
        address      beneficiary,
        string calldata contentCID,
        TriggerType  triggerType,
        uint64       unlockTime,
        bytes32      oracleSubjectId,
        uint8        oracleEventType,
        address      curator,
        uint256      sglAmount,
        bytes32      metadataHash
    ) external whenNotPaused nonReentrant returns (uint256 capsuleId) {
        require(beneficiary              != address(0),  "CAPSULE: invalid beneficiary");
        require(bytes(contentCID).length  > 0,          "CAPSULE: empty CID");
        require(metadataHash             != bytes32(0), "CAPSULE: invalid metadata hash");

        if (triggerType == TriggerType.TimeLock) {
            require(unlockTime > uint64(block.timestamp), "CAPSULE: unlock time in past");
        }
        if (triggerType == TriggerType.OracleEvent) {
            require(oracleSubjectId != bytes32(0), "CAPSULE: invalid oracle subject");
        }
        if (triggerType == TriggerType.ManualCurator) {
            require(curator != address(0), "CAPSULE: invalid curator");
        }

        capsuleId = capsuleCount++;

        capsules[capsuleId] = Capsule({
            creator:         msg.sender,
            beneficiary:     beneficiary,
            contentCID:      contentCID,
            triggerType:     triggerType,
            unlockTime:      unlockTime,
            oracleSubjectId: oracleSubjectId,
            oracleEventType: oracleEventType,
            curator:         curator,
            sglLocked:       sglAmount,
            metadataHash:    metadataHash,
            createdAt:       uint64(block.timestamp),
            unlockedAt:      0,
            status:          CapsuleStatus.Active
        });

        if (sglAmount > 0) {
            sglToken.safeTransferFrom(msg.sender, address(this), sglAmount);
        }

        emit CapsuleCreated(capsuleId, msg.sender, beneficiary, triggerType, sglAmount, contentCID);
    }

    // ─── Unlock por tempo ─────────────────────────────────────────────────

    /// @notice Libera cápsula do tipo TimeLock após o timestamp configurado.
    ///         Qualquer endereço pode chamar após o prazo expirar.
    function unlockByTime(uint256 capsuleId) external whenNotPaused nonReentrant {
        Capsule storage cap = capsules[capsuleId];
        require(cap.status     == CapsuleStatus.Active,   "CAPSULE: not active");
        require(
            cap.triggerType == TriggerType.TimeLock ||
            cap.triggerType == TriggerType.Unrestricted,
            "CAPSULE: wrong trigger type"
        );
        require(uint64(block.timestamp) >= cap.unlockTime, "CAPSULE: unlock time not reached");

        _unlock(capsuleId, cap);
    }

    // ─── Unlock por evento oracle ─────────────────────────────────────────

    /// @notice Libera cápsula do tipo OracleEvent após confirmação no OracleGateway.
    ///         Qualquer endereço pode chamar após evento ser registrado.
    function unlockByOracle(uint256 capsuleId) external whenNotPaused nonReentrant {
        Capsule storage cap = capsules[capsuleId];
        require(cap.status     == CapsuleStatus.Active,        "CAPSULE: not active");
        require(cap.triggerType == TriggerType.OracleEvent,     "CAPSULE: wrong trigger type");
        require(oracleGateway  != address(0),                  "CAPSULE: oracle not configured");

        bool confirmed = IOracleGateway(oracleGateway).hasValidEvent(
            cap.oracleSubjectId,
            cap.oracleEventType
        );
        require(confirmed, "CAPSULE: oracle event not confirmed");

        _unlock(capsuleId, cap);
    }

    // ─── Unlock por curador ───────────────────────────────────────────────

    /// @notice Curador designado aprova a liberação da cápsula ManualCurator.
    function approveByCurator(uint256 capsuleId) external {
        Capsule storage cap = capsules[capsuleId];
        require(cap.status      == CapsuleStatus.Active,         "CAPSULE: not active");
        require(cap.triggerType == TriggerType.ManualCurator,     "CAPSULE: wrong trigger type");
        require(msg.sender      == cap.curator,                  "CAPSULE: not the curator");

        curatorApproved[capsuleId] = true;
        emit CuratorApprovalGranted(capsuleId, msg.sender);
    }

    /// @notice Executor (EXECUTOR_ROLE) executa liberação aprovada pelo curador.
    function executeApprovedCapsule(uint256 capsuleId) external whenNotPaused nonReentrant onlyRole(EXECUTOR_ROLE) {
        Capsule storage cap = capsules[capsuleId];
        require(cap.status      == CapsuleStatus.Active,         "CAPSULE: not active");
        require(cap.triggerType == TriggerType.ManualCurator,     "CAPSULE: wrong trigger type");
        require(curatorApproved[capsuleId],                       "CAPSULE: curator not approved");

        _unlock(capsuleId, cap);
    }

    // ─── Cancelamento ────────────────────────────────────────────────────

    /// @notice Criador cancela a cápsula e recupera o SGL bloqueado.
    ///         Só é possível enquanto a cápsula estiver Active.
    function cancelCapsule(uint256 capsuleId) external whenNotPaused nonReentrant {
        Capsule storage cap = capsules[capsuleId];
        require(cap.status  == CapsuleStatus.Active, "CAPSULE: not active");
        require(msg.sender  == cap.creator,          "CAPSULE: not creator");

        cap.status = CapsuleStatus.Cancelled;

        if (cap.sglLocked > 0) {
            sglToken.safeTransfer(cap.creator, cap.sglLocked);
        }

        emit CapsuleCancelled(capsuleId, msg.sender);
    }

    // ─── Administração ────────────────────────────────────────────────────

    /// @notice Atualiza endereço do OracleGateway (ex: após deploy do Módulo 4).
    function setOracleGateway(address newGateway) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address old = oracleGateway;
        oracleGateway = newGateway;
        emit OracleGatewayUpdated(old, newGateway);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ─── Consultas ────────────────────────────────────────────────────────

    function getCapsuleStatus(uint256 capsuleId) external view returns (CapsuleStatus) {
        return capsules[capsuleId].status;
    }

    // ─── Interno ─────────────────────────────────────────────────────────

    function _unlock(uint256 capsuleId, Capsule storage cap) internal {
        cap.status     = CapsuleStatus.Unlocked;
        cap.unlockedAt = uint64(block.timestamp);

        uint256 amount = cap.sglLocked;
        if (amount > 0) {
            sglToken.safeTransfer(cap.beneficiary, amount);
        }

        emit CapsuleUnlocked(capsuleId, cap.beneficiary, msg.sender, amount);
    }
}
