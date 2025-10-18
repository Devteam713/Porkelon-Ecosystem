// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Porkelon is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    uint256 public constant TOTAL_SUPPLY = 100_000_000_000 * 10**18; // 100B $PORK
    uint256 public constant PRESALE_ALLOCATION = 40_000_000_000 * 10**18; // 40B

    event Minted(address indexed to, uint256 amount);

    function initialize(address owner) public initializer {
        __ERC20_init("Porkelon", "PORK");
        __Ownable_init(owner);
        _mint(owner, PRESALE_ALLOCATION);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= TOTAL_SUPPLY, "Exceeds total supply");
        _mint(to, amount);
        emit Minted(to, amount);
    }
}
