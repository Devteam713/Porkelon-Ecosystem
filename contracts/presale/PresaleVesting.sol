// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PresaleVesting
 * @notice Users buy PORK with USDT, then claim vested tokens linearly over time.
 * @dev Compatible with tax token; presale contract always receives full amount and sends full vesting without re-tax.
 */
contract PresaleVesting is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable pork;
    IERC20 public immutable paymentToken;
    uint256 public immutable pricePerToken;
    uint256 public immutable vestingDuration;
    uint256 public startTime;
    uint256 public endTime;

    mapping(address => uint256) public totalPurchased;
    mapping(address => uint256) public claimed;
    mapping(address => uint256) public purchaseTime;

    event TokensPurchased(address indexed buyer, uint256 paidAmount, uint256 tokenAmount);
    event TokensClaimed(address indexed buyer, uint256 amount);

    constructor(
        address _pork,
        address _paymentToken,
        uint256 _pricePerToken,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _vestingDuration
    ) Ownable(msg.sender) {
        require(_pork != address(0) && _paymentToken != address(0), "invalid addresses");
        require(_startTime < _endTime, "bad timing");
        pork = IERC20(_pork);
        paymentToken = IERC20(_paymentToken);
        pricePerToken = _pricePerToken;
        startTime = _startTime;
        endTime = _endTime;
        vestingDuration = _vestingDuration;
    }

    modifier onlyActive() {
        require(block.timestamp >= startTime && block.timestamp <= endTime, "presale inactive");
        _;
    }

    function buy(uint256 paymentAmount) external onlyActive {
        require(paymentAmount > 0, "zero payment");
        paymentToken.safeTransferFrom(msg.sender, address(this), paymentAmount);

        uint256 porkAmount = (paymentAmount * 1e18) / pricePerToken;
        totalPurchased[msg.sender] += porkAmount;
        purchaseTime[msg.sender] = block.timestamp;

        emit TokensPurchased(msg.sender, paymentAmount, porkAmount);
    }

    function claim() external {
        uint256 vested = vestedAmount(msg.sender);
        uint256 claimable = vested - claimed[msg.sender];
        require(claimable > 0, "nothing claimable");

        claimed[msg.sender] += claimable;
        pork.safeTransfer(msg.sender, claimable); // tax still applies (1%) when user receives

        emit TokensClaimed(msg.sender, claimable);
    }

    function vestedAmount(address user) public view returns (uint256) {
        uint256 total = totalPurchased[user];
        if (total == 0) return 0;
        uint256 elapsed = block.timestamp - purchaseTime[user];
        if (elapsed >= vestingDuration) return total;
        return (total * elapsed) / vestingDuration;
    }

    function withdrawPayments(address to) external onlyOwner {
        paymentToken.safeTransfer(to, paymentToken.balanceOf(address(this)));
    }
}
