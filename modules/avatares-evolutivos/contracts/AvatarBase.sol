// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AvatarBase
/// @notice Stub seguro para registro imutavel de avatares na blockchain.
///         Cada avatar e um NFT ERC721 com CID IPFS do snapshot de memoria.
/// @dev Proximo passo: integrar AvatarWalletLink, ConsentRegistry e AvatarPro.
contract AvatarBase is ERC721, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE    = keccak256("MINTER_ROLE");
    bytes32 public constant UPDATER_ROLE   = keccak256("UPDATER_ROLE");
    bytes32 public constant DEACTIVATOR_ROLE = keccak256("DEACTIVATOR_ROLE");

    struct AvatarData {
        address creator;
        string  ipfsCID;
        uint64  creationTime;
        uint64  lastUpdateTime;
        bool    isActive;
    }

    uint256 private _nextAvatarId;

    mapping(uint256 => AvatarData)   private _avatarData;
    mapping(uint256 => string[])     private _snapshotHistory;

    event AvatarCreated(
        uint256 indexed avatarId,
        address indexed creator,
        string ipfsCID
    );
    event SnapshotUpdated(
        uint256 indexed avatarId,
        string newCID,
        address indexed operator
    );
    event AvatarDeactivated(
        uint256 indexed avatarId,
        address indexed operator
    );

    constructor(address admin) ERC721("SingulAI Avatar", "SGLA") {
        require(admin != address(0), "AVATAR: invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE,        admin);
        _grantRole(UPDATER_ROLE,       admin);
        _grantRole(DEACTIVATOR_ROLE,   admin);
    }

    // ─── Operacoes de avatar ───────────────────────────────────────────────

    /// @notice Cria um avatar NFT para o criador com o CID do snapshot inicial.
    function mintAvatar(
        address creator,
        string calldata ipfsCID
    ) external whenNotPaused onlyRole(MINTER_ROLE) returns (uint256 avatarId) {
        require(creator != address(0), "AVATAR: invalid creator");
        require(bytes(ipfsCID).length > 0, "AVATAR: empty CID");

        avatarId = _nextAvatarId++;

        _avatarData[avatarId] = AvatarData({
            creator:        creator,
            ipfsCID:        ipfsCID,
            creationTime:   uint64(block.timestamp),
            lastUpdateTime: uint64(block.timestamp),
            isActive:       true
        });

        _snapshotHistory[avatarId].push(ipfsCID);
        _safeMint(creator, avatarId);

        emit AvatarCreated(avatarId, creator, ipfsCID);
    }

    /// @notice Atualiza o snapshot do avatar (novo CID IPFS com memorias adicionadas).
    ///         Pode ser chamado pelo proprio criador ou por UPDATER_ROLE.
    function updateSnapshot(
        uint256 avatarId,
        string calldata newCID
    ) external whenNotPaused {
        AvatarData storage data = _avatarData[avatarId];
        require(data.isActive, "AVATAR: avatar inactive");
        require(bytes(newCID).length > 0, "AVATAR: empty CID");
        require(
            data.creator == msg.sender || hasRole(UPDATER_ROLE, msg.sender),
            "AVATAR: not authorized"
        );

        data.ipfsCID        = newCID;
        data.lastUpdateTime = uint64(block.timestamp);
        _snapshotHistory[avatarId].push(newCID);

        emit SnapshotUpdated(avatarId, newCID, msg.sender);
    }

    /// @notice Desativa um avatar (direito ao esquecimento / LGPD).
    ///         Pode ser chamado pelo proprio criador ou por DEACTIVATOR_ROLE.
    function deactivateAvatar(uint256 avatarId) external whenNotPaused {
        AvatarData storage data = _avatarData[avatarId];
        require(data.isActive, "AVATAR: already inactive");
        require(
            data.creator == msg.sender || hasRole(DEACTIVATOR_ROLE, msg.sender),
            "AVATAR: not authorized"
        );

        data.isActive = false;

        emit AvatarDeactivated(avatarId, msg.sender);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getAvatar(uint256 avatarId) external view returns (AvatarData memory) {
        return _avatarData[avatarId];
    }

    function getSnapshotHistory(uint256 avatarId) external view returns (string[] memory) {
        return _snapshotHistory[avatarId];
    }

    /// @dev Retorna URI IPFS do snapshot atual.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat("ipfs://", _avatarData[tokenId].ipfsCID);
    }

    // ─── Hooks internos ──────────────────────────────────────────────────

    /// @dev Bloqueia transfers enquanto contrato estiver pausado.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }

    // ─── Interface ────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}