// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingRewards
 * @notice Staking contract that distributes rewards in the rewards token.
 *         Designed to be tax-aware on stake (handles tokens that charge a fee on transfer).
 *         Owner must supply reward tokens to the contract before (or as part of) notifyRewardAmount.
 */
contract StakingRewards is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /* ========== IMMUTABLES ========== */

    IERC20 public immutable stakingToken; // token users stake
    IERC20 public immutable rewardsToken; // token used for rewards

    /* ========== CONSTANTS ========== */

    uint256 private constant PRECISION = 1e18;

    /* ========== STATE VARIABLES ========== */

    uint256 public rewardRate; // reward tokens distributed per second
    uint256 public lastUpdate; // last time rewardPerTokenStored was updated
    uint256 public rewardPerTokenStored; // accumulated reward per token, scaled by PRECISION
    uint256 public periodFinish; // timestamp when current reward period ends

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards; // pending rewards

    uint256 public totalSupply; // total staked tokens (reflects net tokens received when staking taxed tokens)
    mapping(address => uint256) public balances;

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward, uint256 duration);
    event RecoveredERC20(address token, uint256 amount, address to);

    /* ========== CONSTRUCTOR ========== */

    /**
     * @param _stakingToken Address of token to be staked
     * @param _rewardsToken Address of token used for rewards
     */
    constructor(address _stakingToken, address _rewardsToken) {
        require(_stakingToken != address(0) && _rewardsToken != address(0), "zero address");
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    /* ========== VIEWS ========== */

    /**
     * @notice Last time at which rewards are applicable (min(block.timestamp, periodFinish))
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /**
     * @notice Returns the reward per token, scaled by PRECISION
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdate;
        return rewardPerTokenStored + (timeDelta * rewardRate * PRECISION) / totalSupply;
    }

    /**
     * @notice Returns earned rewards for an account (not yet claimed)
     */
    function earned(address account) public view returns (uint256) {
        uint256 rptDelta = rewardPerToken() - userRewardPerTokenPaid[account];
        return (balances[account] * rptDelta) / PRECISION + rewards[account];
    }

    /**
     * @notice Convenience getter for a user's staked balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Modifier to update reward accounting for an account (and global stored values)
     */
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdate = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /**
     * @notice Stake tokens. Handles tokens that take fee-on-transfer by crediting the actual net amount received.
     * @param amount The amount to transfer from the user (the actual credited stake may be lower if the token charges a fee)
     */
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "stake=0");

        uint256 before = stakingToken.balanceOf(address(this));
        // transferFrom is performed; owner of tokens must have approved this contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 after = stakingToken.balanceOf(address(this));

        uint256 actualReceived = after - before;
        require(actualReceived > 0, "no tokens transferred");

        // credit only the net amount actually received (tax-aware)
        totalSupply += actualReceived;
        balances[msg.sender] += actualReceived;

        emit Staked(msg.sender, actualReceived);
    }

    /**
     * @notice Withdraw a specific amount of staked tokens.
     * @param amount Amount to withdraw (must be <= user's balance)
     */
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "withdraw=0");
        require(balances[msg.sender] >= amount, "insufficient balance");

        // effects
        balances[msg.sender] -= amount;
        totalSupply -= amount;

        // interactions
        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim accumulated reward tokens
     */
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) {
            return;
        }

        rewards[msg.sender] = 0;
        // transfer reward tokens (rewardsToken must be present in contract)
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
     * @notice Notify contract of new rewards and set distribution duration. Owner must transfer reward tokens to this contract
     *         as part of this call (safeTransferFrom) — owner must have approved this contract.
     * @param reward Amount of reward tokens to add for distribution
     * @param duration Distribution duration in seconds (must be > 0)
     *
     * Behavior:
     * - If previous period finished, new rewardRate = reward / duration
     * - If previous period still running, leftover rewards are added: rewardRate = (reward + leftover) / duration
     */
    function notifyRewardAmount(uint256 reward, uint256 duration) external onlyOwner updateReward(address(0)) {
        require(duration > 0, "bad duration");
        require(reward > 0, "no reward");

        // Pull reward tokens from owner into the contract. Owner must approve this contract prior to calling.
        rewardsToken.safeTransferFrom(msg.sender, address(this), reward);

        if (block.timestamp >= periodFinish) {
            rewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / duration;
        }

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
        require(token != address(stakingToken) && token != address(rewardsToken), "protected token");
        IERC20(token).safeTransfer(to, amount);
        emit RecoveredERC20(token, amount, to);
    }
}
