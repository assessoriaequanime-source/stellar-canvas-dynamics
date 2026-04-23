// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Interface para consulta on-chain ao OracleGateway (Módulo 4 — mesmo contrato).
///      Usado por releasePosition para verificar o evento antes de liberar fundos.
interface IOracleGateway {
    function hasValidEvent(bytes32 subjectId, uint8 eventType) external view returns (bool);
}

/// @title InstitutionalEscrow
/// @notice Stub seguro para bloqueio oracle-triggered de ativos SGL em cenários
///         institucionais: sucessão bancária, sinistros de seguros e legados jurídicos.
///         A liberação depende de um evento validado pelo OracleGateway, não de tempo.
/// @dev Próximo passo: integrar OracleGateway on-chain via interface e multi-witness
///      para aprovação de múltiplos oráculos antes do release.
contract InstitutionalEscrow is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE    = keccak256("EXECUTOR_ROLE");
    bytes32 public constant COMPLIANCE_ROLE  = keccak256("COMPLIANCE_ROLE");

    enum EscrowStatus { Pending, Released, Cancelled, Frozen }

    /// @notice Tipo de evento oracle que libera este escrow.
    ///         Deve coincidir com OracleGateway.EventType.
    enum TriggerEventType {
        DeathCertificate,
        BirthCertificate,
        NotarialProof,
        CourtHomologation,
        BankConfirmation,
        InsurancePayout,
        KYCVerification,
        CustomEvent
    }

    struct InstitutionalPosition {
        address     depositor;
        address     beneficiary;
        uint256     amount;
        bytes32     subjectId;          // hash do sujeito no OracleGateway
        TriggerEventType triggerEvent;  // evento exigido para liberar
        uint256     triggerEventId;     // eventId confirmado pelo executor
        bytes32     metadataHash;       // hash do contrato institucional off-chain
        string      partnerCode;        // codigo do parceiro (WhiteLabelRegistry)
        uint64      createdAt;
        uint64      executedAt;
        EscrowStatus status;
    }

    uint256 public nextPositionId;
    IERC20  public immutable sglToken;
    address public treasury;
    address public oracleGateway; // OracleGateway deste mesmo módulo

    mapping(uint256 => InstitutionalPosition) public positions;

    event PositionCreated(
        uint256 indexed positionId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        bytes32 subjectId,
        TriggerEventType triggerEvent,
        string partnerCode
    );
    event PositionReleased(
        uint256 indexed positionId,
        uint256 indexed triggerEventId,
        address indexed executor
    );
    event PositionCancelled(
        uint256 indexed positionId,
        address indexed operator,
        string reason
    );
    event PositionFrozen(
        uint256 indexed positionId,
        address indexed operator,
        string reason
    );
    event PositionUnfrozen(
        uint256 indexed positionId,
        address indexed operator
    );
    event OracleGatewayUpdated(
        address indexed oldGateway,
        address indexed newGateway
    );

    constructor(address tokenAddress, address treasuryAddress, address admin) {
        require(tokenAddress    != address(0), "INST_ESC: invalid token");
        require(treasuryAddress != address(0), "INST_ESC: invalid treasury");
        require(admin           != address(0), "INST_ESC: invalid admin");

        sglToken = IERC20(tokenAddress);
        treasury = treasuryAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE,      admin);
        _grantRole(COMPLIANCE_ROLE,    admin);
    }

    // ─── Criação de posição ───────────────────────────────────────────────

    /// @notice Cria uma posição institucional com o evento oracle necessário para liberação.
    function createPosition(
        address           beneficiary,
        uint256           amount,
        bytes32           subjectId,
        TriggerEventType  triggerEvent,
        bytes32           metadataHash,
        string calldata   partnerCode
    ) external whenNotPaused nonReentrant returns (uint256 positionId) {
        require(beneficiary  != address(0), "INST_ESC: invalid beneficiary");
        require(amount        > 0,          "INST_ESC: zero amount");
        require(subjectId    != bytes32(0), "INST_ESC: invalid subject");
        require(metadataHash != bytes32(0), "INST_ESC: invalid metadata hash");
        require(bytes(partnerCode).length > 0, "INST_ESC: empty partner code");

        positionId = nextPositionId++;

        positions[positionId] = InstitutionalPosition({
            depositor:      msg.sender,
            beneficiary:    beneficiary,
            amount:         amount,
            subjectId:      subjectId,
            triggerEvent:   triggerEvent,
            triggerEventId: 0,
            metadataHash:   metadataHash,
            partnerCode:    partnerCode,
            createdAt:      uint64(block.timestamp),
            executedAt:     0,
            status:         EscrowStatus.Pending
        });

        sglToken.safeTransferFrom(msg.sender, address(this), amount);

        emit PositionCreated(
            positionId, msg.sender, beneficiary, amount,
            subjectId, triggerEvent, partnerCode
        );
    }

    // ─── Execução oracle-triggered ────────────────────────────────────────

    /// @notice Libera a posição após confirmação on-chain do evento oracle.
    ///         Verifica diretamente no OracleGateway antes de transferir os fundos.
    ///         O EXECUTOR_ROLE informa o eventId como referência de auditoria.
    /// @param triggerEventId ID do evento registrado no OracleGateway (para rastreio).
    function releasePosition(
        uint256 positionId,
        uint256 triggerEventId
    ) external whenNotPaused nonReentrant onlyRole(EXECUTOR_ROLE) {
        InstitutionalPosition storage pos = positions[positionId];
        require(pos.status == EscrowStatus.Pending,   "INST_ESC: not pending");
        require(pos.createdAt > 0,                    "INST_ESC: not found");

        // ─── Verificação on-chain no OracleGateway ────────────────────────
        if (oracleGateway != address(0)) {
            bool confirmed = IOracleGateway(oracleGateway).hasValidEvent(
                pos.subjectId,
                uint8(pos.triggerEvent)
            );
            require(confirmed, "INST_ESC: oracle event not confirmed");
        }

        pos.status         = EscrowStatus.Released;
        pos.triggerEventId = triggerEventId;
        pos.executedAt     = uint64(block.timestamp);

        sglToken.safeTransfer(pos.beneficiary, pos.amount);

        emit PositionReleased(positionId, triggerEventId, msg.sender);
    }

    /// @notice Cancela a posição e devolve ao depositante.
    ///         Requer COMPLIANCE_ROLE (ex: departamento jurídico).
    function cancelPosition(
        uint256 positionId,
        string calldata reason
    ) external whenNotPaused nonReentrant onlyRole(COMPLIANCE_ROLE) {
        InstitutionalPosition storage pos = positions[positionId];
        require(pos.status == EscrowStatus.Pending, "INST_ESC: not cancellable");
        require(bytes(reason).length > 0,            "INST_ESC: reason required");

        pos.status     = EscrowStatus.Cancelled;
        pos.executedAt = uint64(block.timestamp);

        sglToken.safeTransfer(pos.depositor, pos.amount);

        emit PositionCancelled(positionId, msg.sender, reason);
    }

    /// @notice Congela uma posição sob investigação de compliance (AML, fraude).
    ///         Ativos ficam bloqueados no contrato até descongelamento ou cancelamento.
    function freezePosition(
        uint256 positionId,
        string calldata reason
    ) external onlyRole(COMPLIANCE_ROLE) {
        InstitutionalPosition storage pos = positions[positionId];
        require(pos.status == EscrowStatus.Pending, "INST_ESC: not freezable");
        require(bytes(reason).length > 0,            "INST_ESC: reason required");

        pos.status = EscrowStatus.Frozen;

        emit PositionFrozen(positionId, msg.sender, reason);
    }

    /// @notice Descongela uma posição após resolução do compliance.
    function unfreezePosition(uint256 positionId) external onlyRole(COMPLIANCE_ROLE) {
        require(
            positions[positionId].status == EscrowStatus.Frozen,
            "INST_ESC: not frozen"
        );

        positions[positionId].status = EscrowStatus.Pending;

        emit PositionUnfrozen(positionId, msg.sender);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "INST_ESC: invalid treasury");
        treasury = newTreasury;
    }

    /// @notice Configura o endereço do OracleGateway para verificação on-chain.
    ///         Permite deploy faseado: InstitutionalEscrow pode ser deployado antes
    ///         do OracleGateway e configurado após.
    function setOracleGateway(address newGateway) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address old = oracleGateway;
        oracleGateway = newGateway;
        emit OracleGatewayUpdated(old, newGateway);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
