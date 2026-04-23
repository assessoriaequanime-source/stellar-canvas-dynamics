// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ConsentRegistry
/// @notice Stub seguro para registro de consentimentos LGPD/GDPR on-chain.
///         Usa bitmask para combinar multiplos tipos de consentimento em um unico registro.
///         Toda concessao e revogacao gera evento imutavel para trilha de prova legal.
/// @dev Proximo passo: integrar com pipeline off-chain para remoção de dados (direito
///      ao esquecimento) e com AvatarPro para bloquear sessoes sem consentimento.
contract ConsentRegistry is AccessControl, Pausable {
    bytes32 public constant CONSENT_MANAGER_ROLE = keccak256("CONSENT_MANAGER_ROLE");

    // ─── Tipos de consentimento (bitmask) ─────────────────────────────────
    uint8 public constant CONSENT_VOICE      = 1;  // bit 0 - uso de voz/audio
    uint8 public constant CONSENT_MARKETING  = 2;  // bit 1 - comunicacoes marketing
    uint8 public constant CONSENT_DATA_SALE  = 4;  // bit 2 - venda de interacoes
    uint8 public constant CONSENT_LEGAL_USE  = 8;  // bit 3 - uso em contextos juridicos

    struct ConsentRecord {
        uint8   grantedFlags;    // bitmask dos consentimentos vigentes
        uint64  lastUpdatedAt;
        bytes32 documentHash;    // hash do documento de consentimento assinado
    }

    // avatarId => usuario => registro de consentimento
    mapping(uint256 => mapping(address => ConsentRecord)) private _consents;

    event ConsentGranted(
        uint256 indexed avatarId,
        address indexed user,
        uint8 flags,
        bytes32 documentHash
    );
    event ConsentRevoked(
        uint256 indexed avatarId,
        address indexed user,
        uint8 revokedFlags,
        uint8 remainingFlags
    );

    constructor(address admin) {
        require(admin != address(0), "CONSENT: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE,   admin);
        _grantRole(CONSENT_MANAGER_ROLE, admin);
    }

    // ─── Gestao de consentimento ──────────────────────────────────────────

    /// @notice Registra consentimentos concedidos pelo usuario.
    ///         Acumula flags: chamar novamente adiciona novas permissoes sem remover existentes.
    /// @param avatarId     ID do avatar ao qual o consentimento se aplica.
    /// @param user         Endereço do usuario que consentiu.
    /// @param flags        Bitmask das permissoes concedidas (ex: CONSENT_VOICE | CONSENT_MARKETING).
    /// @param documentHash Hash SHA-256 do documento de consentimento assinado (LGPD Art. 8).
    function grantConsent(
        uint256 avatarId,
        address user,
        uint8   flags,
        bytes32 documentHash
    ) external whenNotPaused onlyRole(CONSENT_MANAGER_ROLE) {
        require(user         != address(0), "CONSENT: invalid user");
        require(flags        >  0,          "CONSENT: no flags set");
        require(documentHash != bytes32(0), "CONSENT: invalid document hash");

        ConsentRecord storage record = _consents[avatarId][user];
        record.grantedFlags   |= flags;
        record.lastUpdatedAt   = uint64(block.timestamp);
        record.documentHash    = documentHash;

        emit ConsentGranted(avatarId, user, flags, documentHash);
    }

    /// @notice Revoga consentimentos especificos do usuario (direito de retirada LGPD Art. 8 §5).
    ///         O evento permanece on-chain como prova da revogacao.
    /// @param flags Bitmask dos consentimentos a serem revogados.
    function revokeConsent(
        uint256 avatarId,
        address user,
        uint8   flags
    ) external whenNotPaused onlyRole(CONSENT_MANAGER_ROLE) {
        require(user  != address(0), "CONSENT: invalid user");
        require(flags >  0,          "CONSENT: no flags set");

        ConsentRecord storage record = _consents[avatarId][user];
        require(
            (record.grantedFlags & flags) != 0,
            "CONSENT: flags not previously granted"
        );

        record.grantedFlags  &= ~flags;
        record.lastUpdatedAt  = uint64(block.timestamp);

        emit ConsentRevoked(avatarId, user, flags, record.grantedFlags);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Verifica se o usuario possui TODOS os consentimentos solicitados vigentes.
    function hasConsent(
        uint256 avatarId,
        address user,
        uint8   flags
    ) external view returns (bool) {
        return ((_consents[avatarId][user].grantedFlags & flags) == flags);
    }

    /// @notice Retorna o registro completo de consentimento de um usuario.
    function getConsent(
        uint256 avatarId,
        address user
    ) external view returns (ConsentRecord memory) {
        return _consents[avatarId][user];
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}