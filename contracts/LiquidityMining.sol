// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LiquidityMining
 * @notice Simple liquidity-mining contract where LP token holders stake their LP tokens
 *         to earn PORK rewards. Rewards are denominated as **net** amounts to be received
 *         by users. Because PORK charges 1% on all transfers, this contract gross-ups
 *         reward transfers so the user receives the net reward intended.
 *
 * Token tax assumptions:
 *  - TAX_BPS must match the PORK token tax (100 bps = 1%).
 *  - When we transfer `gross` PORK to user, PORK token will send `tax = gross * TAX_BPS / 10000`
 *    to devWallet and user will receive `gross - tax`. We compute `gross` so that:
 *       net = gross * (10000 - TAX_BPS) / 10000
 *    => gross = ceil( net * 10000 / (10000 - TAX_BPS) )
 *
 * Notes:
 *  - Owner must fund this contract with enough PORK (gross amounts) prior to notifyRewardAmount.
 *  - Uses rewardRate over duration (notifyRewardAmount) similar to many staking contracts.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityMining is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // LP token staked (e.g., Uniswap/QuickSwap pair)
    IERC20 public immutable lpToken;
    // Reward token (PORK)
    IERC20 public immutable rewardToken;

    // Reward accounting
    uint256 public rewardRate; // reward tokens (net) per second, in net terms (we will gross-up on transfers)
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public periodFinish;

    // user accounting
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards; // rewards (net) accumulated

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    // Tax settings — MUST match the PORK tax
    uint256 public constant TAX_BPS = 100; // 100 = 1%
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 private constant NET_DENOM = BPS_DIVISOR - TAX_BPS; // 9900 for 1% tax

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 netReward);
    event RewardAdded(uint256 netReward, uint256 duration);

    constructor(address _lpToken, address _rewardToken) Ownable() {
        require(_lpToken != address(0) && _rewardToken != address(0), "invalid addresses");
        lpToken = IERC20(_lpToken);
        rewardToken = IERC20(_rewardToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // --- view helpers ---
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    // rewardPerTokenStored expressed in net reward * 1e18
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) return rewardPerTokenStored;
        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdateTime;
        // rewardRate is net reward per second (desired net tokens distributed per second)
        return rewardPerTokenStored + (timeDelta * rewardRate * 1e18) / _totalSupply;
    }

    // earned(X) returns net reward accumulated for user X (not yet claimed)
    function earned(address account) public view returns (uint256) {
        return (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    // totalSupply / balanceOf
    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }

    // --- user actions ---

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "stake 0");
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "withdraw 0");
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // withdraw all + get reward convenience
    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    // getReward pays out the user's earned net reward; we gross-up so the net arrives after PORK tax
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 netReward = rewards[msg.sender];
        if (netReward == 0) return;
        rewards[msg.sender] = 0;

        // compute gross such that after token tax, the user receives `netReward`
        // gross = ceil(netReward * BPS_DIVISOR / NET_DENOM)
        // To avoid rounding giving less net, we compute as:
        uint256 grossNumerator = netReward * BPS_DIVISOR;
        uint256 gross = grossNumerator / NET_DENOM;
        if (grossNumerator % NET_DENOM != 0) {
            gross += 1; // ceil
        }

        // ensure contract has enough rewardToken balance
        uint256 bal = rewardToken.balanceOf(address(this));
        require(bal >= gross, "insufficient reward pool");

        // transfer gross => token takes TAX_BPS to devWallet; recipient receives netReward (approx)
        rewardToken.safeTransfer(msg.sender, gross);

        emit RewardPaid(msg.sender, netReward);
    }

    // --- admin: fund and configure rewards ---

    /**
     * @notice Owner funds rewards (PORK) to this contract off-chain by sending PORK to this address,
     *         then calls notifyRewardAmount with the net reward to distribute and the duration.
     * @param netReward Net amount (what users in total should receive) to distribute across `duration` seconds
     * @param duration seconds duration for distribution
     *
     * Note: The owner must ensure to transfer the required **gross** amount into this contract first:
     * grossTotal = ceil(netRewardTotal * BPS_DIVISOR / NET_DENOM)
     */
    function notifyRewardAmount(uint256 netReward, uint256 duration) external onlyOwner updateReward(address(0)) {
        require(duration > 0, "duration 0");
        // compute reward rate in net/second
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

    // emergency rescue for tokens other than rewardToken & lpToken
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(rewardToken) && token != address(lpToken), "cannot rescue core tokens");
        IERC20(token).safeTransfer(to, amount);
    }
}
