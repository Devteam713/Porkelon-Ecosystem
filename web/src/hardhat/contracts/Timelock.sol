// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title PorkelonTimelock
 * @dev This contract implements the protocol's governance Timelock,
 * inheriting from OpenZeppelin's robust TimelockController.
 * It enforces a mandatory minimum delay for all sensitive administrative
 * operations (upgrades, critical parameter changes) across the Porkelon
 * ecosystem contracts (Token, Presale, Staking, Liquidity).
 */
contract PorkelonTimelock is TimelockController {
    /**
     * @notice Constructor for the Timelock Controller.
     * @param minDelay The minimum delay (in seconds) for a proposed operation to be executed.
     * @param proposers List of addresses initially granted the PROPOSER_ROLE (can schedule operations).
     * @param executors List of addresses initially granted the EXECUTOR_ROLE (can execute scheduled operations).
     * @param admin Address to receive the DEFAULT_ADMIN_ROLE (can grant/revoke other roles).
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    )
        // Pass arguments directly to the OpenZeppelin TimelockController constructor
        TimelockController(minDelay, proposers, executors, admin)
    {
        // No additional initialization needed
    }

    /**
     * @notice Returns the name of the contract, for clarity on block explorers.
     */
    function name() public pure returns (string memory) {
        return "Porkelon Protocol Timelock";
    }

    // The core functionality (schedule, execute, cancel, roles) is inherited.
}
