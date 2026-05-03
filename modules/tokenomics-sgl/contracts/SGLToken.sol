// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title SGLToken
/// @notice Stub seguro do token SGL para evolucao no Hardhat.
/// @dev Proximo passo: integrar multisig treasury, AvatarPro e politicas de emissao governadas.
contract SGLToken is ERC20Burnable, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    address public treasury;

    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event Minted(address indexed to, uint256 amount, address indexed operator);

    constructor(address initialTreasury, uint256 initialSupply) ERC20("SingulAI Token", "SGL") {
        require(initialTreasury != address(0), "SGL: invalid treasury");

        treasury = initialTreasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        _mint(initialTreasury, initialSupply);
        emit Minted(initialTreasury, initialSupply, msg.sender);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "SGL: invalid treasury");

        address previousTreasury = treasury;
        treasury = newTreasury;

        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "SGL: invalid recipient");

        _mint(to, amount);
        emit Minted(to, amount, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}