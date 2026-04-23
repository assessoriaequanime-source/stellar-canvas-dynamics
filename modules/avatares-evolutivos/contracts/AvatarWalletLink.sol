// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AvatarWalletLink
/// @notice Stub seguro para vincular carteiras a avatares com niveis de permissao.
///         Todas as concessoes e revogacoes ficam registradas como eventos on-chain
///         para trilha de auditoria (LGPD/GDPR).
/// @dev Proximo passo: integrar validacao de titularidade via AvatarBase NFT.
contract AvatarWalletLink is AccessControl, Pausable {
    bytes32 public constant LINKER_ROLE = keccak256("LINKER_ROLE");

    /// @notice Niveis de permissao crescentes por carteira vinculada.
    enum PermissionLevel {
        None,        // sem vinculo
        Viewer,      // so pode visualizar o avatar publico
        Interactor,  // pode iniciar sessoes de chat/voz
        Manager      // pode atualizar snapshots e delegar permissoes
    }

    struct WalletPermission {
        PermissionLevel level;
        uint64 grantedAt;
        uint64 expiresAt;   // 0 = sem expiracao
    }

    // avatarId => carteira => permissao
    mapping(uint256 => mapping(address => WalletPermission)) private _permissions;
    // avatarId => lista de carteiras vinculadas (nao removidas para manter rastro)
    mapping(uint256 => address[]) private _linkedWallets;

    event WalletLinked(
        uint256 indexed avatarId,
        address indexed wallet,
        PermissionLevel level,
        uint64 expiresAt
    );
    event WalletUnlinked(
        uint256 indexed avatarId,
        address indexed wallet,
        address indexed operator
    );
    event PermissionUpdated(
        uint256 indexed avatarId,
        address indexed wallet,
        PermissionLevel oldLevel,
        PermissionLevel newLevel
    );

    constructor(address admin) {
        require(admin != address(0), "LINK: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LINKER_ROLE, admin);
    }

    // ─── Vinculacao ───────────────────────────────────────────────────────

    /// @notice Vincula uma carteira a um avatar com nivel de permissao e expiracao opcional.
    function linkWallet(
        uint256 avatarId,
        address wallet,
        PermissionLevel level,
        uint64 expiresAt
    ) external whenNotPaused onlyRole(LINKER_ROLE) {
        require(wallet != address(0), "LINK: invalid wallet");
        require(level != PermissionLevel.None, "LINK: invalid level");
        require(expiresAt == 0 || expiresAt > block.timestamp, "LINK: invalid expiry");

        WalletPermission storage perm = _permissions[avatarId][wallet];
        bool isNew = perm.level == PermissionLevel.None;

        if (!isNew) {
            emit PermissionUpdated(avatarId, wallet, perm.level, level);
        }

        perm.level     = level;
        perm.grantedAt = uint64(block.timestamp);
        perm.expiresAt = expiresAt;

        if (isNew) {
            _linkedWallets[avatarId].push(wallet);
            emit WalletLinked(avatarId, wallet, level, expiresAt);
        }
    }

    /// @notice Remove o vinculo de uma carteira com um avatar.
    ///         O evento permanece no historico on-chain para auditoria.
    function unlinkWallet(
        uint256 avatarId,
        address wallet
    ) external whenNotPaused onlyRole(LINKER_ROLE) {
        require(
            _permissions[avatarId][wallet].level != PermissionLevel.None,
            "LINK: not linked"
        );

        delete _permissions[avatarId][wallet];

        emit WalletUnlinked(avatarId, wallet, msg.sender);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    /// @notice Verifica se uma carteira possui pelo menos o nivel de permissao requerido
    ///         e se o vinculo nao expirou.
    function hasPermission(
        uint256 avatarId,
        address wallet,
        PermissionLevel minLevel
    ) external view returns (bool) {
        WalletPermission storage perm = _permissions[avatarId][wallet];
        if (perm.level < minLevel) return false;
        if (perm.expiresAt != 0 && block.timestamp > perm.expiresAt) return false;
        return true;
    }

    /// @notice Retorna o registro completo de permissao de uma carteira.
    function getPermission(
        uint256 avatarId,
        address wallet
    ) external view returns (WalletPermission memory) {
        return _permissions[avatarId][wallet];
    }

    /// @notice Lista todas as carteiras que ja foram vinculadas a um avatar.
    ///         Inclui registros deletados (nivel None) para preservar trilha historica.
    function getLinkedWallets(uint256 avatarId) external view returns (address[] memory) {
        return _linkedWallets[avatarId];
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}