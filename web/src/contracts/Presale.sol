// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Presale is Ownable {
    address public token;
    uint256 public constant PRICE_PER_PORK = 0.00005 ether; // MATIC per PORK
    uint256 public totalRaised;
    uint256 public constant MAX_PURCHASE = 1000 ether; // Max 1000 MATIC per tx
    bool public presaleActive;

    event TokensPurchased(address indexed buyer, uint256 amount, uint256 maticPaid);

    constructor(address _token) Ownable(msg.sender) {
        token = _token;
        presaleActive = true;
    }

    function buyTokens(uint256 amount) external payable {
        require(presaleActive, "Presale ended");
        uint256 maticRequired = (amount * PRICE_PER_PORK) / 1e18;
        require(msg.value >= maticRequired, "Insufficient MATIC");
        require(msg.value <= MAX_PURCHASE, "Exceeds max purchase");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");
        totalRaised += msg.value;
        IERC20(token).transfer(msg.sender, amount);
        emit TokensPurchased(msg.sender, amount, msg.value);
    }

    function endPresale() external onlyOwner {
        presaleActive = false;
    }

    function withdraw() external onlyOwner {
        require(!presaleActive, "Presale still active");
        payable(owner()).transfer(address(this).balance);
    }
}
