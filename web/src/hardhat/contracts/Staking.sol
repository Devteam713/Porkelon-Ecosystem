// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PorkelonStaking
 * @dev Allows users to stake PORK tokens to earn rewards.
 * Rewards are pulled from a designated "Migration Vault" or Treasury to ensure 
 * the staking contract itself doesn't need to hold massive reward reserves.
 */
contract Staking is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    IERC20 public immutable stakingToken;       // The Porkelon Token
    address public immutable migrationVault;    // Source of reward tokens (Treasury/Vault)

    // Staking Configuration
    uint256 public rewardRatePerSecond;         // Tokens distributed per second per staked token (scaled)
    uint256 public constant REWARD_PRECISION = 1e18; // Precision handling for division
    uint256 public minStakeAmount = 1000 * 1e18;     // Minimum amount to stake

    // User Info
    struct StakerInfo {
        uint256 stakedAmount;     // Total tokens staked
        uint256 rewardsEarned;    // Pending rewards explicitly credited
        uint256 lastUpdateTime;   // Timestamp of last interaction
        uint256 lockEndTime;      // Timestamp when lock expires (if locking is enabled)
    }

    mapping(address => StakerInfo) public stakers;

    // Global Stats
    uint256 public totalStaked;

    // --- Events ---

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event MinStakeUpdated(uint256 newMin);

    // --- Constructor ---

    /**
     * @param _stakingToken The PORK token address.
     * @param _migrationVault The address of the vault/treasury holding reward tokens.
     */
    constructor(address _stakingToken, address _migrationVault) Ownable2Step(msg.sender) {
        require(_stakingToken != address(0), "Staking: Invalid token address");
        require(_migrationVault != address(0), "Staking: Invalid vault address");

        stakingToken = IERC20(_stakingToken);
        migrationVault = _migrationVault;
    }

    // --- User Actions ---

    /**
     * @notice Stakes a specific amount of tokens.
     * @param amount The amount of PORK to stake.
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Staking: Cannot stake 0");
        
        _updateRewards(msg.sender);

        // Update state
        stakers[msg.sender].stakedAmount += amount;
        totalStaked += amount;

        // Requirement check
        require(stakers[msg.sender].stakedAmount >= minStakeAmount, "Staking: Below minimum stake");

        // Transfer tokens from user to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraws staked tokens and claims pending rewards.
     * @param amount The amount to withdraw.
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Staking: Cannot withdraw 0");
        require(stakers[msg.sender].stakedAmount >= amount, "Staking: Insufficient balance");
        require(block.timestamp >= stakers[msg.sender].lockEndTime, "Staking: Tokens are locked");

        _updateRewards(msg.sender);

        // Update state
        stakers[msg.sender].stakedAmount -= amount;
        totalStaked -= amount;

        // Transfer tokens back to user
        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claims pending rewards without withdrawing staked tokens.
     */
    function claimRewards() external nonReentrant whenNotPaused {
        _updateRewards(msg.sender);

        uint256 reward = stakers[msg.sender].rewardsEarned;
        require(reward > 0, "Staking: No rewards to claim");

        stakers[msg.sender].rewardsEarned = 0;

        // Transfer rewards from the Migration Vault to the user
        // NOTE: The MigrationVault must have called `approve` for this contract
        stakingToken.safeTransferFrom(migrationVault, msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @notice View function to see pending rewards.
     */
    function pendingRewards(address user) external view returns (uint256) {
        StakerInfo memory info = stakers[user];
        uint256 duration = block.timestamp - info.lastUpdateTime;
        uint256 pending = (info.stakedAmount * rewardRatePerSecond * duration) / REWARD_PRECISION;
        return info.rewardsEarned + pending;
    }

    // --- Internal Logic ---

    /**
     * @dev Updates the reward state for a specific user.
     * Calculated as: (stakedAmount * rate * timeElapsed)
     */
    function _updateRewards(address user) internal {
        StakerInfo storage info = stakers[user];
        
        uint256 currentTime = block.timestamp;
        uint256 duration = currentTime - info.lastUpdateTime;

        if (duration > 0 && info.stakedAmount > 0) {
            uint256 earned = (info.stakedAmount * rewardRatePerSecond * duration) / REWARD_PRECISION;
            info.rewardsEarned += earned;
        }

        info.lastUpdateTime = currentTime;
    }

    // --- Admin Functions ---

    /**
     * @notice Sets the reward rate.
     * Example: To give 10% APY, calculate the rate per second based on 1e18 precision.
     */
    function setRewardRate(uint256 _ratePerSecond) external onlyOwner {
        rewardRatePerSecond = _ratePerSecond;
        emit RewardRateUpdated(_ratePerSecond);
    }

    function setMinStakeAmount(uint256 _amount) external onlyOwner {
        minStakeAmount = _amount;
        emit MinStakeUpdated(_amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
