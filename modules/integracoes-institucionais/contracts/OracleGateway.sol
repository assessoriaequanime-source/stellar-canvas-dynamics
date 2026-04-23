// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @dev Interface para verificar se um parceiro está ativo no WhiteLabelRegistry.
interface IWhiteLabelRegistry {
    function isActive(string calldata partnerCode) external view returns (bool);
}

/// @title OracleGateway
/// @notice Stub seguro para registro de eventos oficiais assinados por operadores
///         autorizados (cartórios digitais, ICP-Brasil, APIs bancárias, notários UE).
///         Cada evento é imutável e rastreável, servindo como gatilho para contratos
///         off-chain e on-chain (TimeCapsule, InstitutionalEscrow).
/// @dev Próximo passo: integrar Chainlink Functions ou Chainlink Any API para
///      consumo de eventos externos sem depender de operador centralizado.
contract OracleGateway is AccessControl, Pausable {
    bytes32 public constant ORACLE_OPERATOR_ROLE = keccak256("ORACLE_OPERATOR_ROLE");
    bytes32 public constant RELAYER_ROLE         = keccak256("RELAYER_ROLE");

    // ─── Tipos de evento suportados ───────────────────────────────────────
    enum EventType {
        DeathCertificate,       // Certidão de óbito
        BirthCertificate,       // Certidão de nascimento
        NotarialProof,          // Prova notarial (cartório / ICP-Brasil)
        CourtHomologation,      // Homologação judicial
        BankConfirmation,       // Confirmação bancária de sinistro
        InsurancePayout,        // Pagamento de apólice de seguro
        KYCVerification,        // Verificação KYC concluída
        CustomEvent             // Evento institucional customizado
    }

    struct OfficialEvent {
        EventType   eventType;
        bytes32     subjectId;      // hash do CPF/CNPJ do sujeito (nunca PII direta)
        bytes32     dataHash;       // SHA-256 do documento original (off-chain)
        bytes32     signatureHash;  // hash da assinatura digital do emissor
        uint64      recordedAt;
        address     operator;
        bool        isValid;        // pode ser invalidado por ORACLE_OPERATOR_ROLE
        string      institutionCode;// codigo da instituicao emissora (ex: "CARTORIO_SP_01")
    }

    uint256 public eventCount;
    address public whiteLabelRegistry; // WhiteLabelRegistry do mesmo módulo
    mapping(uint256 => OfficialEvent) public events;

    // subjectId => lista de eventIds relacionados ao sujeito
    mapping(bytes32 => uint256[]) private _subjectEvents;

    event OfficialEventRecorded(
        uint256 indexed eventId,
        EventType indexed eventType,
        bytes32 indexed subjectId,
        bytes32 dataHash,
        address operator,
        string institutionCode
    );
    event EventInvalidated(
        uint256 indexed eventId,
        address indexed operator,
        string reason
    );
    event WhiteLabelRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    constructor(address admin) {
        require(admin != address(0), "ORACLE: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE,   admin);
        _grantRole(ORACLE_OPERATOR_ROLE, admin);
        _grantRole(RELAYER_ROLE,         admin);
    }

    // ─── Registro de eventos ──────────────────────────────────────────────

    /// @notice Registra um evento oficial assinado por um operador autorizado.
    ///         O documento real permanece off-chain; apenas o hash fica on-chain.
    ///         Quando WhiteLabelRegistry está configurado, exige que a instituição
    ///         emissora esteja ativa no registro antes de aceitar o evento.
    /// @param eventType      Tipo do evento oficial.
    /// @param subjectId      Hash irreversível do identificador do sujeito (CPF/CNPJ etc).
    /// @param dataHash       SHA-256 do documento oficial completo.
    /// @param signatureHash  Hash da assinatura digital do emissor (ICP-Brasil, eIDAS).
    /// @param institutionCode Código único da instituição emissora cadastrada.
    function recordEvent(
        EventType   eventType,
        bytes32     subjectId,
        bytes32     dataHash,
        bytes32     signatureHash,
        string calldata institutionCode
    ) external whenNotPaused onlyRole(ORACLE_OPERATOR_ROLE) returns (uint256 eventId) {
        require(subjectId      != bytes32(0), "ORACLE: invalid subject");
        require(dataHash       != bytes32(0), "ORACLE: invalid data hash");
        require(signatureHash  != bytes32(0), "ORACLE: invalid signature hash");
        require(bytes(institutionCode).length > 0, "ORACLE: empty institution");

        // ─── Guard: parceiro deve estar ativo no WhiteLabelRegistry ──────
        if (whiteLabelRegistry != address(0)) {
            require(
                IWhiteLabelRegistry(whiteLabelRegistry).isActive(institutionCode),
                "ORACLE: institution not active in registry"
            );
        }

        eventId = eventCount++;

        events[eventId] = OfficialEvent({
            eventType:       eventType,
            subjectId:       subjectId,
            dataHash:        dataHash,
            signatureHash:   signatureHash,
            recordedAt:      uint64(block.timestamp),
            operator:        msg.sender,
            isValid:         true,
            institutionCode: institutionCode
        });

        _subjectEvents[subjectId].push(eventId);

        emit OfficialEventRecorded(
            eventId, eventType, subjectId, dataHash, msg.sender, institutionCode
        );
    }

    /// @notice Invalida um evento registrado com erro ou fraude detectada.
    ///         Mantém o registro original para trilha histórica; apenas marca isValid=false.
    function invalidateEvent(
        uint256 eventId,
        string calldata reason
    ) external onlyRole(ORACLE_OPERATOR_ROLE) {
        require(events[eventId].recordedAt > 0,  "ORACLE: event not found");
        require(events[eventId].isValid,          "ORACLE: already invalid");
        require(bytes(reason).length > 0,         "ORACLE: reason required");

        events[eventId].isValid = false;

        emit EventInvalidated(eventId, msg.sender, reason);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Verifica se existe ao menos um evento válido de um tipo para um sujeito.
    function hasValidEvent(
        bytes32   subjectId,
        EventType eventType
    ) external view returns (bool) {
        uint256[] storage ids = _subjectEvents[subjectId];
        for (uint256 i = 0; i < ids.length; i++) {
            OfficialEvent storage ev = events[ids[i]];
            if (ev.eventType == eventType && ev.isValid) {
                return true;
            }
        }
        return false;
    }

    /// @notice Retorna todos os IDs de eventos associados a um sujeito.
    function getSubjectEvents(bytes32 subjectId) external view returns (uint256[] memory) {
        return _subjectEvents[subjectId];
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    /// @notice Configura o WhiteLabelRegistry para validação de parceiros.
    ///         Permite deploy faseado: pode ser configurado após deploy inicial.
    function setWhiteLabelRegistry(address newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address old = whiteLabelRegistry;
        whiteLabelRegistry = newRegistry;
        emit WhiteLabelRegistryUpdated(old, newRegistry);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
