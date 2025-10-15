// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PorkelonToken (PORK)
 * @notice ERC20 with 1% transaction tax to developer wallet, pausable, burnable, capped at 100B supply.
 * @dev Compatible with OpenZeppelin Contracts v5.x.
 */

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract PorkelonToken is ERC20Permit, ERC20Burnable, Pausable, Ownable {
    /// @notice maximum total supply: 100 billion PORK
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 1e18;

    /// @notice dev wallet that collects 1% tax
    address public devWallet;

    /// @notice tax rate in basis points (100 = 1%)
    uint256 public constant TAX_BPS = 100; // 1%
    uint256 public constant BPS_DIVISOR = 10_000;

    event DevWalletUpdated(address indexed newWallet);
    event TaxCollected(address indexed from, uint256 amount);

    constructor(address _devWallet)
        ERC20("Porkelon", "PORK")
        ERC20Permit("Porkelon")
        Ownable(msg.sender)
    {
        require(_devWallet != address(0), "Invalid dev wallet");
        devWallet = _devWallet;
        _mint(msg.sender, MAX_SUPPLY); // Mint 100 billion to deployer initially
    }

    /**
     * @notice Update developer wallet (only owner)
     */
    function setDevWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet");
        devWallet = _newWallet;
        emit DevWalletUpdated(_newWallet);
    }

    /**
     * @notice Pause all transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Overrides ERC20 _update (v5 replaces _beforeTokenTransfer/_afterTokenTransfer)
     * @dev Applies 1% tax to every transfer except:
     *   - minting/burning
     *   - when sender or receiver is the dev wallet
     *   - when owner calls transfers (can be adjusted if needed)
     */
    function _update(address from, address to, uint256 amount) internal override {
        require(!paused(), "PORK: paused");

        // Minting or burning should bypass tax
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        uint256 taxAmount = 0;

        if (from != devWallet && to != devWallet) {
            taxAmount = (amount * TAX_BPS) / BPS_DIVISOR;
            if (taxAmount > 0) {
                super._update(from, devWallet, taxAmount);
                emit TaxCollected(from, taxAmount);
            }
        }

        uint256 sendAmount = amount - taxAmount;
        super._update(from, to, sendAmount);
    }
}
