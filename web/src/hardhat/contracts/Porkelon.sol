// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Porkelon is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, PausableUpgradeable, AccessControlUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18; // 100 billion tokens with 18 decimals
    address public teamWallet; // Wallet for collecting 1% transaction fees

    // NEW: Mapping to track addresses excluded from the fee
    mapping(address => bool) private _isExcludedFromFee;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _teamWallet) initializer public {
        __ERC20_init("Porkelon", "PORK");
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        teamWallet = _teamWallet;

        // NEW: Exclude the team wallet (fee recipient) from being taxed when receiving fees
        _isExcludedFromFee[teamWallet] = true;
        // Also exclude the contract address itself from fees (standard practice)
        _isExcludedFromFee[address(this)] = true;

        // Mint the entire max supply at initialization
        uint256 totalSupplyToMint = MAX_SUPPLY;

        // Allocations (replace placeholder addresses with actual wallet addresses)
        _mint(address(0xYourDevWalletAddressHere), (totalSupplyToMint * 25) / 100);
        _mint(address(0xYourStakingRewardsWalletAddressHere), (totalSupplyToMint * 10) / 100);
        _mint(address(0xYourLiquidityWalletAddressHere), (totalSupplyToMint * 40) / 100);
        _mint(address(0xYourMarketingWalletAddressHere), (totalSupplyToMint * 10) / 100);
        _mint(address(0xYourAirdropsWalletAddressHere), (totalSupplyToMint * 5) / 100);
        _mint(address(0xYourPresaleWalletAddressHere), (totalSupplyToMint * 10) / 100);

        // Revoke minter role
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender); 
    }

    // NEW: Owner-only function to manage the exclusion list
    function setExcludedFromFee(address account, bool isExcluded) public onlyOwner {
        require(account != address(0), "Invalid address");
        _isExcludedFromFee[account] = isExcluded;
    }

    function isExcludedFromFee(address account) public view returns (bool) {
        return _isExcludedFromFee[account];
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(UPGRADER_ROLE) override {}

    // MODIFIED: Override to apply 1% fee on transfers, with exclusions
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        bool shouldTakeFee = !_isExcludedFromFee[from] && !_isExcludedFromFee[to];

        if (from != address(0) && to != address(0) && teamWallet != address(0) && shouldTakeFee) {
            uint256 fee = (value * 1) / 100; // 1% fee
            uint256 amountAfterFee = value - fee;
            
            // Fee is transferred first, bypassing the regular fee logic (since teamWallet is excluded)
            super._update(from, teamWallet, fee);
            
            // Remaining amount is transferred to recipient
            super._update(from, to, amountAfterFee);
        } else {
            // No fee taken (mint, burn, or excluded address involved)
            super._update(from, to, value);
        }
    }

    // Optional: Function to update team wallet (only owner, for flexibility)
    function setTeamWallet(address newTeamWallet) public onlyOwner {
        require(newTeamWallet != address(0), "Invalid address");
        // Remove old team wallet from exclusion list if it was there
        if (_isExcludedFromFee[teamWallet]) {
            _isExcludedFromFee[teamWallet] = false;
        }
        teamWallet = newTeamWallet;
        // Add new team wallet to exclusion list
        _isExcludedFromFee[teamWallet] = true;
    }
}
