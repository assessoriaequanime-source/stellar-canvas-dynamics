// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock ERC20 com função mint. Usado apenas em testes.
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, address admin)
        ERC20(name, symbol)
    {
        _mint(admin, 10_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
