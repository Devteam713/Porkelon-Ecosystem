// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title PorkelonGovernor
 * @dev The core contract for the Porkelon DAO.
 * Inherits all required modules: Voting, Counting (For/Against/Abstain), Timelock integration.
 * The Governor must be set as the proposer role on the TimelockController.
 */
contract PorkelonGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorTimelockControl,
    GovernorSettings
{
    // --- Configuration Constants ---

    // 1 Day (approx. 7200 blocks @ ~12s block time)
    uint256 public constant INITIAL_VOTING_DELAY = 1; // Start voting immediately after proposal
    // 7 Days (approx. 50400 blocks)
    uint256 public constant INITIAL_VOTING_PERIOD = 50400; 
    // 4% of total supply (or number of votes) required to pass a vote
    uint256 public constant INITIAL_QUORUM_NUMERATOR = 4;
    // Minimum number of tokens required to submit a proposal (e.g., 100,000 PORK)
    uint256 public constant INITIAL_PROPOSAL_THRESHOLD = 100000 * 10**18;

    /**
     * @param _token The Porkelon ERC20Votes token address.
     * @param _timelock The Porkelon TimelockController address.
     */
    constructor(
        ERC20Votes _token,
        TimelockController _timelock
    )
        // Core Governor name
        Governor("Porkelon Governor")
        // Votes extension (connects to Porkelon token)
        GovernorVotes(address(_token))
        // Timelock extension (connects to Porkelon Timelock)
        GovernorTimelockControl(address(_timelock))
        // Settings extension
        GovernorSettings(
            INITIAL_VOTING_DELAY,
            INITIAL_VOTING_PERIOD,
            INITIAL_PROPOSAL_THRESHOLD,
            INITIAL_QUORUM_NUMERATOR
        )
    {}

    // --- Governor Overrides (Required) ---

    // Sets the denominator for Quorum (100 means 4/100 = 4%)
    function quorumDenominator() public pure override(Governor, GovernorSettings) returns (uint256) {
        return 100;
    }

    // Connects the Governor to the ERC20Votes clock (which uses block numbers by default)
    function clock() public view override(Governor, GovernorTimelockControl) returns (uint48) {
        return uint48(block.number);
    }

    // The token's clock mode (typically "block" for ERC20Votes)
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber";
    }

    // --- Functions from GovernorSettings (Needed for override completion) ---
    
    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }
}
