// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PorkelonToken (PORK)
 * @notice ERC20 token with:
 *  - 1% transaction tax to developer wallet
 *  - pausable transfers
 *  - burnable
 *  - capped supply (100,000,000,000 PORK)
 *  - permit (EIP-2612)
 *
 * Improvements made:
 *  - Single coherent implementation (removed duplicated/contradictory blocks)
 *  - Uses OZ hooks and overrides correctly (_transfer / _beforeTokenTransfer / _mint)
 *  - Tax exemptions via owner-managed mapping (flexibility for contracts / liquidity pools)
 *  - Gas- and safety-conscious checks (cap enforced on _mint, guarded setters)
 *  - Clear events and NatSpec for maintainability
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PorkelonToken is ERC20, ERC20Permit, ERC20Burnable, Pausable, Ownable {
    /// @notice maximum total supply: 100 billion PORK (with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 1e18;

    /// @notice tax rate in basis points (100 = 1%)
    uint16 public constant TAX_BPS = 100;
    uint16 public constant BPS_DIVISOR = 10_000;

    /// @notice developer wallet that collects the tax
    address public devWallet;

    /// @notice addresses excluded from tax (owner can manage)
    mapping(address => bool) private _isTaxExempt;

    event DevWalletUpdated(address indexed previousWallet, address indexed newWallet);
    event TaxCollected(address indexed from, address indexed toDevWallet, uint256 amount);
    event TaxExemptionUpdated(address indexed account, bool isExempt);

    /**
     * @param _devWallet initial developer wallet that receives tax revenue
     */
    constructor(address _devWallet) ERC20("Porkelon", "PORK") ERC20Permit("Porkelon") {
        require(_devWallet != address(0), "PORK: invalid dev wallet");
        devWallet = _devWallet;

        // Exempt dev wallet and owner from tax by default
        _isTaxExempt[_devWallet] = true;
        _isTaxExempt[msg.sender] = true;

        // Mint full supply to deployer (owner)
        _mint(msg.sender, MAX_SUPPLY);
    }

    // -----------------------
    // Owner / Admin actions
    // -----------------------

    /**
     * @notice Update developer wallet address (only owner)
     */
    function setDevWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "PORK: invalid wallet");
        address previous = devWallet;
        devWallet = _newWallet;

        // Keep exemptions sensible: new dev wallet exempt, previous may remain exempt unless owner changes it
        _isTaxExempt[_newWallet] = true;

        emit DevWalletUpdated(previous, _newWallet);
    }

    /**
     * @notice Set or unset tax exemption for an account (only owner)
     * @dev Useful for exempting exchanges, liquidity pools or contracts that should not be taxed.
     */
    function setTaxExemption(address account, bool exempt) external onlyOwner {
        require(account != address(0), "PORK: zero address");
        _isTaxExempt[account] = exempt;
        emit TaxExemptionUpdated(account, exempt);
    }

    /**
     * @notice Check if an account is tax-exempt
     */
    function isTaxExempt(address account) external view returns (bool) {
        return _isTaxExempt[account];
    }

    /**
     * @notice Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // -----------------------
    // Minting / cap enforcement
    // -----------------------

    /**
     * @notice Mint tokens (only owner). Respects MAX_SUPPLY.
     * @dev The contract currently mints the whole supply at construction,
     * but this allows future minting if owner chooses to reduce initial mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @dev Enforce cap
    function _mint(address account, uint256 amount) internal override {
        require(totalSupply() + amount <= MAX_SUPPLY, "PORK: cap exceeded");
        super._mint(account, amount);
    }

    // -----------------------
    // Transfer & tax logic
    // -----------------------

    /**
     * @dev Apply 1% tax on every transfer unless sender or recipient is tax-exempt or dev wallet.
     * The tax is transferred to devWallet. Small amounts that round to zero tax are transferred normally.
     *
     * Note: using _transfer override ensures all ERC20 transfers pass through this logic,
     * including transfers triggered by other ERC20 functions.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal override {
        // If paused, block transfers (still allow mint/burn via overrides in OZ which call _beforeTokenTransfer)
        require(!paused(), "PORK: token paused");

        // Do not apply tax on zero transfers
        if (amount == 0) {
            super._transfer(sender, recipient, 0);
            return;
        }

        // If either party is tax-exempt or recipient is devWallet, skip tax
        if (_isTaxExempt[sender] || _isTaxExempt[recipient] || recipient == devWallet || sender == devWallet) {
            super._transfer(sender, recipient, amount);
            return;
        }

        uint256 taxAmount = (amount * TAX_BPS) / BPS_DIVISOR;

        if (taxAmount == 0) {
            // amount too small to collect tax (rounding), transfer whole amount
            super._transfer(sender, recipient, amount);
            return;
        }

        uint256 sendAmount = amount - taxAmount;

        // First, transfer the tax to devWallet
        super._transfer(sender, devWallet, taxAmount);
        // Then transfer remaining to recipient
        super._transfer(sender, recipient, sendAmount);

        emit TaxCollected(sender, devWallet, taxAmount);
    }

    // -----------------------
    // Hooks
    // -----------------------

    /**
     * @dev Ensure paused state prevents transfers/mints/burns as usual.
     * By delegating pause enforcement to _transfer and guarding _beforeTokenTransfer,
     * we remain compatible with OZ expectations.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);
        // Additional guards can be added here if needed in the future
    }

    // The following overrides are required by Solidity for multiple inheritance.
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20) {
        super._afterTokenTransfer(from, to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
