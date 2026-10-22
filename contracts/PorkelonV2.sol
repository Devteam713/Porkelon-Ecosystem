// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Porkelon (PKLN) — V2
 * @dev UUPS upgrade of Porkelon. Storage layout is append-only compatible with V1:
 * no state variables were added, removed, or reordered — only a new role
 * constant and an admin mint function.
 * V2 adds: MINTER_ROLE + mint() so the presale allocation can be funded on
 * testnet (the V1 hardcoded presale wallet is not accessible).
 */
contract PorkelonV2 is 
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
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // --- Supply Configuration ---
    // Total Supply: 200 Billion tokens
    uint256 public constant MAX_SUPPLY = 200_000_000_000 * 10**18; 
    
    // --- Hardcoded Allocation Wallets (100% of MAX_SUPPLY) ---
    // Dev: 25% (0.25 * MAX_SUPPLY)
    address private constant WALLET_DEV = 0xF9ad6caDD243895Db7F05B48241E9db003722153;
    // Staking: 10% (0.10 * MAX_SUPPLY)
    address private constant WALLET_STAKING = 0xBc2E051f3Dedcd0B9dDCA2078472f513a37df2C6;
    // Liquidity: 40% (0.40 * MAX_SUPPLY)
    address private constant WALLET_LIQUIDITY = 0x7d64766FFED1A6311F4F0D3dEBe28212b8C0Ab24;
    // Marketing / Tax Recipient: 10% (0.10 * MAX_SUPPLY)
    address private constant WALLET_MARKETING = 0xcfe1f215d199b24F240711b3a7Cf30453D8F4566;
    // Airdrops: 5% (0.05 * MAX_SUPPLY)
    address private constant WALLET_AIRDROPS = 0x235b647db500C712f1ca2B435EB6E1e8E3A0D182;
    // Presale: 10% (0.10 * MAX_SUPPLY)
    address private constant WALLET_PRESALE = 0x14b34Ad74758EBa399A532Aa1885FE60F91974ca;

    // --- Fee Configuration ---
    // The teamWallet receives the 1% tax, defaulting to the hardcoded Marketing wallet.
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
     * @dev Initializer function (replaces constructor).
     * @param _defaultAdmin The master admin (e.g., Timelock or Multisig).
     * All allocation addresses are hardcoded constants.
     */
    function initialize(address _defaultAdmin) public initializer {
        __ERC20_init("Porkelon", "PKLN");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init("Porkelon");
        __ERC20Votes_init();
        __UUPSUpgradeable_init();

        // --- Role Setup ---
        // The default admin manages pausing, upgrading, and overall governance.
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(PAUSER_ROLE, _defaultAdmin);
        _grantRole(UPGRADER_ROLE, _defaultAdmin);

        // --- Fee Setup ---
        teamWallet = WALLET_MARKETING; // Set the default tax recipient

        // --- Fee Exclusions ---
        _isExcludedFromFee[_defaultAdmin] = true;
        _isExcludedFromFee[address(this)] = true; // Exclude contract itself
        
        // Exclude all 6 ecosystem wallets from the 1% fee for distribution purposes
        _isExcludedFromFee[WALLET_DEV] = true;
        _isExcludedFromFee[WALLET_STAKING] = true;
        _isExcludedFromFee[WALLET_LIQUIDITY] = true;
        _isExcludedFromFee[WALLET_MARKETING] = true;
        _isExcludedFromFee[WALLET_AIRDROPS] = true;
        _isExcludedFromFee[WALLET_PRESALE] = true;

        // --- Mint Allocations (Total 200B) ---
        // 
        
        _mint(WALLET_DEV, (MAX_SUPPLY * 25) / 100);
        _mint(WALLET_STAKING, (MAX_SUPPLY * 10) / 100);
        _mint(WALLET_LIQUIDITY, (MAX_SUPPLY * 40) / 100);
        _mint(WALLET_MARKETING, (MAX_SUPPLY * 10) / 100);
        _mint(WALLET_AIRDROPS, (MAX_SUPPLY * 5) / 100);
        _mint(WALLET_PRESALE, (MAX_SUPPLY * 10) / 100);
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
     * @dev Update the wallet that receives fees. This is typically the Marketing/Treasury Wallet.
     */
    function setTeamWallet(address newTeamWallet) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTeamWallet != address(0), "Invalid address");
        
        // Remove exclusion from the old team wallet if it was previously excluded
        if (_isExcludedFromFee[teamWallet]) {
            _isExcludedFromFee[teamWallet] = false;
        }
        
        teamWallet = newTeamWallet;
        _isExcludedFromFee[newTeamWallet] = true; // Ensure the new recipient is excluded from the fee
        
        emit TeamWalletUpdated(newTeamWallet);
    }

    function isExcludedFromFee(address account) public view returns (bool) {
        return _isExcludedFromFee[account];
    }

    // --- Authorization ---

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Mint new PORK. Restricted to MINTER_ROLE (default admin holds it).
     * Testnet use: fund the PresaleEngine, since the V1 hardcoded presale
     * wallet allocation is not accessible.
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // --- Overrides ---

    /**
     * @dev Core transfer logic with 1% Fee implementation.
     * The fee is redirected to the 'teamWallet'.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable, ERC20VotesUpgradeable)
    {
        _requireNotPaused();

        // A fee is only taken if it's a standard transfer (not mint/burn) AND neither party is excluded.
        bool takeFee = from != address(0) && to != address(0) && !_isExcludedFromFee[from] && !_isExcludedFromFee[to];

        if (takeFee) {
            uint256 fee = (value * 1) / 100; // 1% fee
            uint256 amountAfterFee = value - fee;

            // Transfer fee to team wallet
            if (fee > 0) {
                // IMPORTANT: The fee transfer itself must use the base `_update` to prevent re-taxing the fee.
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
