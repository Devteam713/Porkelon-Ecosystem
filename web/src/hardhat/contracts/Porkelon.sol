// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Porkelon (PORK)
 * @dev The core governance and utility token of the Porkelon Ecosystem.
 * Features: Upgradeable (UUPS), Pausable, Burnable, DAO-Ready (Votes+Permit), 1% Transfer Tax.
 */
contract Porkelon is 
    Initializable, 
    ERC20Upgradeable, 
    ERC20BurnableUpgradeable, 
    ERC20PausableUpgradeable, 
    AccessControlUpgradeable, 
    ERC20PermitUpgradeable, 
    ERC20VotesUpgradeable, 
    UUPSUpgradeable 
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // --- Supply Configuration ---
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18; // 100 Billion
    
    // --- Fee Configuration ---
    address public teamWallet; 
    mapping(address => bool) private _isExcludedFromFee;

    // --- Events ---
    event TeamWalletUpdated(address indexed newWallet);
    event FeeExclusionUpdated(address indexed account, bool isExcluded);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializer function (replaces constructor for upgradeable contracts).
     * @param _defaultAdmin The master admin (Timelock).
     * @param _teamWallet The wallet to receive the 1% tax.
     * @param _wallets Array of 6 addresses for allocation:
     * [0]: Dev, [1]: Staking, [2]: Liquidity, [3]: Marketing, [4]: Airdrops, [5]: Presale
     */
    function initialize(
        address _defaultAdmin,
        address _teamWallet,
        address[] memory _wallets
    ) public initializer {
        require(_wallets.length == 6, "Invalid wallet list length");
        require(_teamWallet != address(0), "Invalid team wallet");

        __ERC20_init("Porkelon", "PORK");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init("Porkelon");
        __ERC20Votes_init();
        __UUPSUpgradeable_init();

        // Roles
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(PAUSER_ROLE, _defaultAdmin);
        _grantRole(UPGRADER_ROLE, _defaultAdmin);

        // Fee Setup
        teamWallet = _teamWallet;
        _isExcludedFromFee[_defaultAdmin] = true;
        _isExcludedFromFee[_teamWallet] = true;
        _isExcludedFromFee[address(this)] = true;

        // --- Mint Allocations (Total 100B) ---
        // Dev: 25%
        _mint(_wallets[0], (MAX_SUPPLY * 25) / 100);
        // Staking: 10%
        _mint(_wallets[1], (MAX_SUPPLY * 10) / 100);
        // Liquidity: 40%
        _mint(_wallets[2], (MAX_SUPPLY * 40) / 100);
        // Marketing: 10%
        _mint(_wallets[3], (MAX_SUPPLY * 10) / 100);
        // Airdrops: 5%
        _mint(_wallets[4], (MAX_SUPPLY * 5) / 100);
        // Presale: 10%
        _mint(_wallets[5], (MAX_SUPPLY * 10) / 100);
    }

    // --- Admin Functions ---

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Exclude or Include an address from the transfer fee.
     */
    function setExcludedFromFee(address account, bool isExcluded) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "Invalid address");
        _isExcludedFromFee[account] = isExcluded;
        emit FeeExclusionUpdated(account, isExcluded);
    }

    /**
     * @dev Update the wallet that receives fees.
     */
    function setTeamWallet(address newTeamWallet) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTeamWallet != address(0), "Invalid address");
        
        // Update exclusions logic
        if (_isExcludedFromFee[teamWallet]) {
            _isExcludedFromFee[teamWallet] = false;
        }
        
        teamWallet = newTeamWallet;
        _isExcludedFromFee[newTeamWallet] = true;
        
        emit TeamWalletUpdated(newTeamWallet);
    }

    function isExcludedFromFee(address account) public view returns (bool) {
        return _isExcludedFromFee[account];
    }

    // --- Authorization ---

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // --- Overrides ---

    /**
     * @dev Core transfer logic with 1% Fee implementation.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable, ERC20VotesUpgradeable)
    {
        // 1. Check if paused
        if (paused()) {
            _requireNotPaused();
        }

        // 2. Determine if fee applies
        // Fee applies if:
        // - Not a mint (from != 0)
        // - Not a burn (to != 0)
        // - Neither sender nor receiver is excluded
        bool takeFee = from != address(0) && to != address(0) && !_isExcludedFromFee[from] && !_isExcludedFromFee[to];

        if (takeFee) {
            uint256 fee = (value * 1) / 100; // 1% fee
            uint256 amountAfterFee = value - fee;

            // Transfer fee to team wallet
            // Note: We call super._update directly to register votes/checkpoints for the team wallet too
            if (fee > 0) {
                super._update(from, teamWallet, fee);
            }

            // Transfer remaining amount to recipient
            super._update(from, to, amountAfterFee);
        } else {
            // Standard transfer (Mint, Burn, or Excluded)
            super._update(from, to, value);
        }
    }

    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
