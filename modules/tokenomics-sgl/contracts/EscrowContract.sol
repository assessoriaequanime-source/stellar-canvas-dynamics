// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title EscrowContract
/// @notice Stub seguro para bloqueio de SGL antes da entrega de capsulas e legados.
/// @dev Proximo passo: integrar oraculos Chainlink, eventos V_wait e politicas do Guardiao.
contract EscrowContract is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    enum EscrowStatus {
        Pending,
        Released,
        Cancelled
    }

    struct EscrowPosition {
        address depositor;
        address beneficiary;
        uint256 amount;
        uint64 releaseTime;
        bytes32 metadataHash;
        EscrowStatus status;
    }

    IERC20 public immutable sglToken;
    uint256 public nextEscrowId;

    mapping(uint256 => EscrowPosition) public escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint64 releaseTime,
        bytes32 metadataHash
    );
    event EscrowReleased(uint256 indexed escrowId, address indexed operator);
    event EscrowCancelled(uint256 indexed escrowId, address indexed operator);

    constructor(address tokenAddress, address admin) {
        require(tokenAddress != address(0), "ESCROW: invalid token");
        require(admin != address(0), "ESCROW: invalid admin");

        sglToken = IERC20(tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
    }

    function createEscrow(
        address beneficiary,
        uint256 amount,
        uint64 releaseTime,
        bytes32 metadataHash
    ) external whenNotPaused nonReentrant returns (uint256 escrowId) {
        require(beneficiary != address(0), "ESCROW: invalid beneficiary");
        require(amount > 0, "ESCROW: invalid amount");
        require(releaseTime > block.timestamp, "ESCROW: release in past");

        escrowId = nextEscrowId++;

        escrows[escrowId] = EscrowPosition({
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            releaseTime: releaseTime,
            metadataHash: metadataHash,
            status: EscrowStatus.Pending
        });

        sglToken.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(escrowId, msg.sender, beneficiary, amount, releaseTime, metadataHash);
    }

    function releaseEscrow(uint256 escrowId) external whenNotPaused nonReentrant {
        EscrowPosition storage position = escrows[escrowId];

        require(position.status == EscrowStatus.Pending, "ESCROW: inactive");
        require(block.timestamp >= position.releaseTime, "ESCROW: not releasable");
        require(
            msg.sender == position.beneficiary || hasRole(EXECUTOR_ROLE, msg.sender),
            "ESCROW: not authorized"
        );

        position.status = EscrowStatus.Released;
        sglToken.safeTransfer(position.beneficiary, position.amount);

        emit EscrowReleased(escrowId, msg.sender);
    }

    function cancelEscrow(uint256 escrowId) external whenNotPaused nonReentrant {
        EscrowPosition storage position = escrows[escrowId];

        require(position.status == EscrowStatus.Pending, "ESCROW: inactive");
        require(
            msg.sender == position.depositor || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "ESCROW: not authorized"
        );

        position.status = EscrowStatus.Cancelled;
        sglToken.safeTransfer(position.depositor, position.amount);

        emit EscrowCancelled(escrowId, msg.sender);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}