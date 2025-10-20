// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Porkelon is Initializable, ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    string public constant MIGRATED_NAME = "Porkelon Token";
    string public constant MIGRATED_SYMBOL = "$PORK";
    address public immutable ADMIN_ADDRESS = 0xYourAdminWallet; // Replace with real admin
    address public immutable BRIDGE_OPERATOR = 0xYourBridgeWallet; // Replace with real bridge operator
    address public immutable MIGRATION_VAULT = 0xYourVaultWallet; // Replace with real vault
    uint256 public constant INITIAL_MINT_AMOUNT = 100_000_000_000 * 10**18; // 100B $PORK

    event TokensMigrated(address indexed from, address indexed to, uint256 amount);
    event Minted(address indexed to, uint256 amount);

    function initialize(address admin) public initializer {
        require(admin == ADMIN_ADDRESS, "Invalid admin");
        __ERC20_init(MIGRATED_NAME, MIGRATED_SYMBOL);
        __Ownable_init(admin);
        __ReentrancyGuard_init();
        _mint(MIGRATION_VAULT, INITIAL_MINT_AMOUNT);
    }

    function mint(address to, uint256 amount) external onlyOwner nonReentrant {
        require(totalSupply() + amount <= INITIAL_MINT_AMOUNT, "Exceeds total supply");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    // Migration function for bridge (burn old, mint new)
    function migrateTokens(address from, address to, uint256 amount) external nonReentrant {
        require(msg.sender == BRIDGE_OPERATOR, "Only bridge operator");
        require(amount > 0, "Amount must be > 0");
        _burn(from, amount);
        _mint(to, amount);
        emit TokensMigrated(from, to, amount);
    }

    // Override to prevent migration vault from transferring initial mint
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (from == MIGRATION_VAULT) revert("Cannot transfer from migration vault");
        return super.transferFrom(from, to, amount);
    }
}
