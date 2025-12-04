// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingRewards
 * @notice Minimal, gas-conscious staking/rewards contract that:
 *  - Allows staking of an ERC20 (handles fee-on-transfer tokens by crediting net received)
 *  - Distributes rewards in a reward ERC20 token at a per-second rate over a period
 *  - Owner may notify new rewards and duration (supports topping up an active period)
 *
 * Design notes:
 *  - rewardPerTokenStored is scaled by PRECISION to support fractional rewards accounting
 *  - All transfers use SafeERC20
 *  - updateReward modifier keeps user accounting up-to-date on entry/exit of mutative functions
 */
contract StakingRewards is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /* ========== IMMUTABLES ========== */

    IERC20 public immutable stakingToken; // token users stake (may charge fees on transfer)
    IERC20 public immutable rewardsToken; // token distributed as rewards

    /* ========== CONSTANTS ========== */

    // Precision for reward per token accumulators
    uint256 private constant PRECISION = 1e18;

    /* ========== STATE ========== */

    // Reward distribution parameters
    uint256 public rewardRate; // reward tokens distributed per second
    uint256 public lastUpdate; // timestamp of last global update
    uint256 public rewardPerTokenStored; // cumulative reward per token, scaled by PRECISION
    uint256 public periodFinish; // timestamp when current reward period ends

    // Per-user accounting
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards; // accrued rewards not yet claimed

    // Staking balances (reflects net tokens received)
    uint256 public totalSupply;
    mapping(address => uint256) public balances;

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward, uint256 duration);
    event RecoveredERC20(address indexed token, uint256 amount, address indexed to);

    /* ========== CONSTRUCTOR ========== */

    /**
     * @param _stakingToken Address of token to be staked
     * @param _rewardsToken Address of token used for rewards
     */
    constructor(address _stakingToken, address _rewardsToken) {
        require(_stakingToken != address(0) && _rewardsToken != address(0), "StakingRewards: zero address");
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);

        // initialize timing state to current block to avoid arithmetic surprises
        lastUpdate = block.timestamp;
        periodFinish = block.timestamp;
    }

    /* ========== VIEWS ========== */

    /**
     * @notice Last timestamp at which rewards are applicable (min(now, periodFinish))
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        uint256 _now = block.timestamp;
        return _now < periodFinish ? _now : periodFinish;
    }

    /**
     * @notice Reward per token accumulated so far (scaled by PRECISION)
     */
    function rewardPerToken() public view returns (uint256) {
        uint256 _supply = totalSupply;
        if (_supply == 0) {
            return rewardPerTokenStored;
        }

        uint256 _lastApplicable = lastTimeRewardApplicable();
        uint256 _timeDelta = _lastApplicable - lastUpdate;
        // (timeDelta * rewardRate * PRECISION) / totalSupply
        return rewardPerTokenStored + ((_timeDelta * rewardRate * PRECISION) / _supply);
    }

    /**
     * @notice Returns the amount of reward tokens earned by `account` (not yet claimed)
     */
    function earned(address account) public view returns (uint256) {
        uint256 _rptDelta = rewardPerToken() - userRewardPerTokenPaid[account];
        return (balances[account] * _rptDelta) / PRECISION + rewards[account];
    }

    /**
     * @notice Convenience getter for a user's staked balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Returns total rewards (reward token balance) currently held by contract
     */
    function rewardsBalance() external view returns (uint256) {
        return rewardsToken.balanceOf(address(this));
    }

    /**
     * @notice Reward tokens scheduled per full duration (useful helper)
     */
    function getRewardForDuration(uint256 durationSeconds) external view returns (uint256) {
        return rewardRate * durationSeconds;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @dev Update reward accounting (global and for `account`) before executing function body.
     */
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdate = lastTimeRewardApplicable();

        if (account != address(0)) {
            // update account-specific storage
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /**
     * @notice Stake tokens. Handles fee-on-transfer tokens by crediting net received.
     * @param amount Amount to transfer from sender. Actual credited stake may be lower if token fees apply.
     */
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "StakingRewards: stake=0");

        uint256 before = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 after = stakingToken.balanceOf(address(this));

        require(after > before, "StakingRewards: no tokens received");
        uint256 actualReceived = after - before;

        totalSupply += actualReceived;
        balances[msg.sender] += actualReceived;

        emit Staked(msg.sender, actualReceived);
    }

    /**
     * @notice Withdraw a specific amount of staked tokens.
     * @param amount Amount to withdraw (must be <= user's balance)
     */
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "StakingRewards: withdraw=0");
        uint256 userBal = balances[msg.sender];
        require(userBal >= amount, "StakingRewards: insufficient balance");

        // effects
        unchecked {
            balances[msg.sender] = userBal - amount;
            totalSupply -= amount;
        }

        // interactions
        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim accumulated reward tokens to caller
     */
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) {
            return;
        }

        rewards[msg.sender] = 0;
        rewardsToken.safeTransfer(msg.sender, reward);

        emit RewardPaid(msg.sender, reward);
    }

    /**
     * @notice Withdraw all staked tokens and claim rewards in a single call
     */
    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @notice Notify contract of new rewards and set distribution duration. Owner must approve this contract
     *         to pull `reward` tokens prior to calling.
     * @param reward Amount of reward tokens to add for distribution
     * @param duration Distribution duration in seconds (must be > 0)
     *
     * Behavior:
     * - If previous period finished, new rewardRate = reward / duration
     * - If previous period still running, leftover rewards are added: rewardRate = (reward + leftover) / duration
     */
    function notifyRewardAmount(uint256 reward, uint256 duration) external onlyOwner updateReward(address(0)) {
        require(duration > 0, "StakingRewards: bad duration");
        require(reward > 0, "StakingRewards: no reward");

        // Pull reward tokens from owner into the contract. Owner must have approved this contract.
        rewardsToken.safeTransferFrom(msg.sender, address(this), reward);

        // compute new rewardRate
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            // leftover rewards = remaining seconds * current rate
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / duration;
        }

        require(rewardRate > 0, "StakingRewards: rewardRate=0");

        lastUpdate = block.timestamp;
        periodFinish = block.timestamp + duration;

        emit RewardAdded(reward, duration);
    }

    /**
     * @notice Recover ERC20 tokens mistakenly sent to this contract (owner only).
     *         Staking and reward tokens are protected and cannot be recovered via this function.
     * @param token Address of ERC20 to recover
     * @param amount Amount to recover
     * @param to Destination address
     */
    function recoverERC20(address token, uint256 amount, address to) external onlyOwner {
        require(token != address(stakingToken) && token != address(rewardsToken), "StakingRewards: protected token");
        IERC20(token).safeTransfer(to, amount);
        emit RecoveredERC20(token, amount, to);
    }
}
