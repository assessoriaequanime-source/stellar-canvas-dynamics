// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISGLBurnable is IERC20 {
    function burn(uint256 amount) external;
}

/// @title FeeManager
/// @notice Stub de taxas para capsulas, oraculos e fluxos de entrega em SGL.
/// @dev Proximo passo: integrar fee routing por modulo, multisig e politicas de AML/KYC.
contract FeeManager is AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");

    uint16 public constant MAX_BPS = 10_000;

    ISGLBurnable public immutable sglToken;
    address public treasury;
    uint16 public platformFeeBps;
    uint16 public burnFeeBps;

    event FeeCollected(address indexed payer, uint256 indexed baseAmount, uint256 treasuryAmount, uint256 burnedAmount);
    event FeeConfigUpdated(uint16 platformFeeBps, uint16 burnFeeBps, address treasury);

    constructor(address tokenAddress, address treasuryAddress, uint16 platformBps, uint16 burnBps) {
        require(tokenAddress != address(0), "FEE: invalid token");
        require(treasuryAddress != address(0), "FEE: invalid treasury");
        require(platformBps + burnBps <= MAX_BPS, "FEE: invalid bps");

        sglToken = ISGLBurnable(tokenAddress);
        treasury = treasuryAddress;
        platformFeeBps = platformBps;
        burnFeeBps = burnBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
    }

    function quoteFee(uint256 baseAmount) public view returns (uint256 treasuryAmount, uint256 burnedAmount, uint256 totalFee) {
        treasuryAmount = (baseAmount * platformFeeBps) / MAX_BPS;
        burnedAmount = (baseAmount * burnFeeBps) / MAX_BPS;
        totalFee = treasuryAmount + burnedAmount;
    }

    function collectFee(address payer, uint256 baseAmount) external whenNotPaused onlyRole(TREASURER_ROLE) returns (uint256 totalFee) {
        require(payer != address(0), "FEE: invalid payer");

        (uint256 treasuryAmount, uint256 burnedAmount, uint256 total) = quoteFee(baseAmount);
        totalFee = total;

        if (totalFee == 0) {
            return 0;
        }

        IERC20(address(sglToken)).safeTransferFrom(payer, address(this), totalFee);

        if (treasuryAmount > 0) {
            IERC20(address(sglToken)).safeTransfer(treasury, treasuryAmount);
        }

        if (burnedAmount > 0) {
            sglToken.burn(burnedAmount);
        }

        emit FeeCollected(payer, baseAmount, treasuryAmount, burnedAmount);
    }

    function setFeeConfig(address newTreasury, uint16 newPlatformFeeBps, uint16 newBurnFeeBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newTreasury != address(0), "FEE: invalid treasury");
        require(newPlatformFeeBps + newBurnFeeBps <= MAX_BPS, "FEE: invalid bps");

        treasury = newTreasury;
        platformFeeBps = newPlatformFeeBps;
        burnFeeBps = newBurnFeeBps;

        emit FeeConfigUpdated(newPlatformFeeBps, newBurnFeeBps, newTreasury);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}