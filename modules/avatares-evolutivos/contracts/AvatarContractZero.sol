// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AvatarContractZero
/// @notice Base normativa deterministica para seguranca, etica e emergencia dos avatares.
/// @dev O texto oficial permanece off-chain versionado; este contrato ancora hashes imutaveis por versao.
contract AvatarContractZero is AccessControl {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");

    bytes32 public activePolicyHash;
    bytes32 public activeVersionHash;

    // categorias proibidas de alto risco (hard guardrails)
    uint8 public constant CAT_CRIME = 1;
    uint8 public constant CAT_SELF_HARM = 2;
    uint8 public constant CAT_TERRORISM = 3;
    uint8 public constant CAT_ILLICIT_DRUGS = 4;
    uint8 public constant CAT_FINANCIAL_FRAUD = 5;
    uint8 public constant CAT_HATE_ABUSE = 6;

    event PolicyAnchored(
        bytes32 indexed policyHash,
        bytes32 indexed versionHash,
        address indexed operator
    );

    constructor(address admin, bytes32 initialPolicyHash, bytes32 initialVersionHash) {
        require(admin != address(0), "C0: invalid admin");
        require(initialPolicyHash != bytes32(0), "C0: invalid policy hash");
        require(initialVersionHash != bytes32(0), "C0: invalid version hash");

        activePolicyHash = initialPolicyHash;
        activeVersionHash = initialVersionHash;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);

        emit PolicyAnchored(initialPolicyHash, initialVersionHash, admin);
    }

    /// @notice Ancora uma nova versao do Contrato 0 mantendo trilha auditavel on-chain.
    function anchorPolicy(
        bytes32 newPolicyHash,
        bytes32 newVersionHash
    ) external onlyRole(POLICY_ADMIN_ROLE) {
        require(newPolicyHash != bytes32(0), "C0: invalid policy hash");
        require(newVersionHash != bytes32(0), "C0: invalid version hash");

        activePolicyHash = newPolicyHash;
        activeVersionHash = newVersionHash;

        emit PolicyAnchored(newPolicyHash, newVersionHash, msg.sender);
    }

    /// @notice Retorna true quando a categoria deve ser bloqueada por regra global obrigatoria.
    function isProhibitedCategory(uint8 category) external pure returns (bool) {
        return (
            category == CAT_CRIME ||
            category == CAT_SELF_HARM ||
            category == CAT_TERRORISM ||
            category == CAT_ILLICIT_DRUGS ||
            category == CAT_FINANCIAL_FRAUD ||
            category == CAT_HATE_ABUSE
        );
    }
}
