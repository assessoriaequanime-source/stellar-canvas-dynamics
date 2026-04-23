
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Interface para verificar consentimento LGPD/GDPR via ConsentRegistry.
interface IConsentRegistry {
    function hasConsent(uint256 avatarId, address user, uint8 flags) external view returns (bool);
    function CONSENT_VOICE() external view returns (uint8);
}

/// @title AvatarPro
/// @notice Sessoes pagas em SGL com verificacao de consentimento LGPD/GDPR on-chain.
///         Integra ConsentRegistry para bloquear sessoes sem consentimento de voz/dados.
///         Audit trail on-chain com hash off-chain por sessao concluida.
contract AvatarPro is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SESSION_MANAGER_ROLE = keccak256("SESSION_MANAGER_ROLE");
    bytes32 public constant PRICE_SETTER_ROLE    = keccak256("PRICE_SETTER_ROLE");

    struct ServiceConfig {
        uint256 pricePerSession;
        bool    isActive;
        uint32  maxSessionsPerDay;
    }

    struct Session {
        address user;
        uint256 avatarId;
        uint64  startTime;
        uint64  endTime;
        uint256 amountPaid;
        bytes32 sessionDataHash;  // hash do log off-chain para auditoria
    }

    IERC20  public immutable sglToken;
    address public treasury;
    address public consentRegistry; // ConsentRegistry deste mesmo módulo
    uint256 public sessionCount;

    // avatarId => config de servico
    mapping(uint256 => ServiceConfig) public serviceConfigs;
    // sessionId => dados da sessao
    mapping(uint256 => Session) public sessions;
    // avatarId => usuario => dia (timestamp/86400) => contador
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) private _dailyCount;

    event ServiceConfigured(
        uint256 indexed avatarId,
        uint256 pricePerSession,
        bool isActive,
        uint32 maxSessionsPerDay
    );
    event SessionRequested(
        uint256 indexed sessionId,
        uint256 indexed avatarId,
        address indexed user,
        uint256 amountPaid
    );
    event SessionFinalized(
        uint256 indexed sessionId,
        bytes32 sessionDataHash,
        address indexed operator
    );
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );
    event ConsentRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    constructor(
        address tokenAddress,
        address treasuryAddress,
        address admin
    ) {
        require(tokenAddress    != address(0), "PRO: invalid token");
        require(treasuryAddress != address(0), "PRO: invalid treasury");
        require(admin           != address(0), "PRO: invalid admin");

        sglToken = IERC20(tokenAddress);
        treasury = treasuryAddress;

        _grantRole(DEFAULT_ADMIN_ROLE,   admin);
        _grantRole(SESSION_MANAGER_ROLE, admin);
        _grantRole(PRICE_SETTER_ROLE,    admin);
    }

    // ─── Configuracao de servico ──────────────────────────────────────────

    /// @notice Define preco, status e limite diario de sessoes de um avatar.
    function configureService(
        uint256 avatarId,
        uint256 pricePerSession,
        bool    isActive,
        uint32  maxSessionsPerDay
    ) external onlyRole(PRICE_SETTER_ROLE) {
        require(maxSessionsPerDay > 0, "PRO: invalid daily limit");

        serviceConfigs[avatarId] = ServiceConfig({
            pricePerSession:  pricePerSession,
            isActive:         isActive,
            maxSessionsPerDay: maxSessionsPerDay
        });

        emit ServiceConfigured(avatarId, pricePerSession, isActive, maxSessionsPerDay);
    }

    // ─── Sessoes ───────────────────────────────────────────────────────────

    /// @notice Inicia uma sessao paga com o avatar.
    ///         Verifica consentimento LGPD/GDPR antes de debitar SGL.
    ///         Debita SGL do usuario diretamente para o treasury.
    function requestSession(
        uint256 avatarId
    ) external whenNotPaused nonReentrant returns (uint256 sessionId) {
        ServiceConfig storage config = serviceConfigs[avatarId];
        require(config.isActive, "PRO: service inactive");
        require(config.maxSessionsPerDay > 0, "PRO: service not configured");

        // ─── Guard: verificar consentimento de voz/uso antes da sessao ────
        if (consentRegistry != address(0)) {
            uint8 voiceFlag = IConsentRegistry(consentRegistry).CONSENT_VOICE();
            require(
                IConsentRegistry(consentRegistry).hasConsent(avatarId, msg.sender, voiceFlag),
                "PRO: voice consent required (LGPD)"
            );
        }

        uint256 today = block.timestamp / 1 days;
        require(
            _dailyCount[avatarId][msg.sender][today] < config.maxSessionsPerDay,
            "PRO: daily session limit reached"
        );

        sessionId = sessionCount++;

        sessions[sessionId] = Session({
            user:            msg.sender,
            avatarId:        avatarId,
            startTime:       uint64(block.timestamp),
            endTime:         0,
            amountPaid:      config.pricePerSession,
            sessionDataHash: bytes32(0)
        });

        _dailyCount[avatarId][msg.sender][today]++;

        if (config.pricePerSession > 0) {
            sglToken.safeTransferFrom(msg.sender, treasury, config.pricePerSession);
        }

        emit SessionRequested(sessionId, avatarId, msg.sender, config.pricePerSession);
    }

    /// @notice Finaliza uma sessao registrando o hash do log de interacao off-chain.
    ///         Prova auditavel imutavel de que a sessao ocorreu.
    function finalizeSession(
        uint256 sessionId,
        bytes32 sessionDataHash
    ) external onlyRole(SESSION_MANAGER_ROLE) {
        Session storage session = sessions[sessionId];
        require(session.startTime > 0, "PRO: session not found");
        require(session.endTime == 0,  "PRO: already finalized");
        require(sessionDataHash != bytes32(0), "PRO: invalid hash");

        session.endTime         = uint64(block.timestamp);
        session.sessionDataHash = sessionDataHash;

        emit SessionFinalized(sessionId, sessionDataHash, msg.sender);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getDailyCount(
        uint256 avatarId,
        address user
    ) external view returns (uint256) {
        return _dailyCount[avatarId][user][block.timestamp / 1 days];
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "PRO: invalid treasury");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @notice Configura o ConsentRegistry para verificação LGPD/GDPR antes de sessoes.
    ///         Permite deploy faseado: pode ser configurado após deploy inicial.
    function setConsentRegistry(address newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address old = consentRegistry;
        consentRegistry = newRegistry;
        emit ConsentRegistryUpdated(old, newRegistry);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}