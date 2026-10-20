// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LiquidityMining — Tax-Aware LP Staking Rewards
 * @notice Users stake QuickSwap/Uniswap LP tokens → earn PORK rewards
 *         Fully compatible with 1% transfer tax tokens (gross-up logic included)
 * @dev Deploy with reward token only → call setLpToken() once after liquidity is added
 */
contract LiquidityMining is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────────────────────
    // Storage
    // ──────────────────────────────────────────────────────────────
    IERC20 public lpToken;                    // Mutable once via setLpToken()
    IERC20 public immutable rewardToken;      // PORK
    bool public lpTokenSet;

    uint256 public rewardRate;                // Net rewards per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public periodFinish;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards; // Pending net rewards

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    // Tax configuration — MUST match PORK token tax
    uint256 public constant TAX_BPS = 100;           // 1% = 100 bps
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 private constant NET_DENOM = BPS_DIVISOR - TAX_BPS; // 9900

    // ──────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 netReward);
    event RewardAdded(uint256 netReward, uint256 duration);
    event LpTokenSet(address indexed lpToken);

    // ──────────────────────────────────────────────────────────────
    // Constructor & Setup
    // ──────────────────────────────────────────────────────────────
    constructor(address _rewardToken) Ownable(msg.sender) {
        require(_rewardToken != address(0), "Reward token zero");
        rewardToken = IERC20(_rewardToken);
    }

    /// @notice One-time function to set the LP token after liquidity is added
    function setLpToken(address _lpToken) external onlyOwner {
        require(!lpTokenSet, "LP token already set");
        require(_lpToken != address(0), "LP token zero");
        lpToken = IERC20(_lpToken);
        lpTokenSet = true;
        emit LpTokenSet(_lpToken);
    }

    // ──────────────────────────────────────────────────────────────
    // Modifiers & Views
    // ──────────────────────────────────────────────────────────────
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) return rewardPerTokenStored;
        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (timeDelta * rewardRate * 1e18) / _totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }

    // ──────────────────────────────────────────────────────────────
    // User Functions
    // ──────────────────────────────────────────────────────────────
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(lpTokenSet, "LP token not set");
        require(amount > 0, "Cannot stake 0");
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 netReward = rewards[msg.sender];
        if (netReward == 0) return;
        rewards[msg.sender] = 0;

        // Gross-up so user receives exactly netReward after 1% tax
        uint256 grossNumerator = netReward * BPS_DIVISOR;
        uint256 gross = grossNumerator / NET_DENOM;
        if (grossNumerator % NET_DENOM != 0) {
            gross += 1; // ceil division
        }

        require(rewardToken.balanceOf(address(this)) >= gross, "Insufficient reward pool");
        rewardToken.safeTransfer(msg.sender, gross);

        emit RewardPaid(msg.sender, netReward);
    }

    // ──────────────────────────────────────────────────────────────
    // Owner Functions
    // ──────────────────────────────────────────────────────────────
    function notifyRewardAmount(uint256 netReward, uint256 duration) external onlyOwner updateReward(address(0)) {
        require(duration > 0, "Duration zero");
        require(netReward > 0, "Reward zero");

        if (block.timestamp >= periodFinish) {
            rewardRate = netReward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (netReward + leftover) / duration;
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;

        emit RewardAdded(netReward, duration);
    }

    /// @notice Rescue any ERC20 except LP or reward token
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(rewardToken) && token != address(lpToken), "Cannot rescue core tokens");
        IERC20(token).safeTransfer(to, amount);
    }
}
