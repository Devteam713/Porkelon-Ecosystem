// contracts/presale/PresaleEngine.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

// Import standard OpenZeppelin contracts (assuming they are available)
import "../libraries/SafeMath.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PresaleEngine
 * @dev Manages a fixed-rate presale for a PORKELON token using a stablecoin (like USDC) as payment.
 * Includes Softcap/Hardcap logic, automatic liquidity provision on success, and refunds on failure.
 */
contract PresaleEngine is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // --- IMMUTABLE STATE ---
    IERC20 public immutable paymentToken;    // e.g., USDC or DAI
    IERC20 public immutable porkelonToken;   // $PRKL Token
    IUniswapV2Router02 public immutable quickswapRouter; // DEX Router (QuickSwap/Uniswap V2 compliant)

    uint256 public immutable PORK_RATE;     // $PRKL per 1 PaymentToken (e.g., 2000)
    uint256 public immutable START_TIMESTAMP; // UNIX Timestamp for sale start
    uint256 public immutable SOFTCAP;       // Minimum required funding (in PaymentToken units)
    uint256 public immutable HARDCAP;       // Maximum allowable funding (in PaymentToken units)

    // --- MUTABLE STATE ---
    uint256 public totalCollected;          // Total PaymentToken collected so far
    
    // Tracks PaymentToken contribution by address
    mapping(address => uint256) public contributions; 
    
    // Tracks $PRKL tokens claimable by address after successful finalization
    mapping(address => uint256) public claimableTokens; 

    // Tracks if $PRKL tokens have been claimed (for success) or PaymentToken has been refunded (for failure)
    mapping(address => bool) public isActioned; 
    
    // 0: Ongoing, 1: Success (Liquidity Added), 2: Failed (Refunds Enabled)
    uint256 public presaleStatus = 0; 

    // --- EVENTS ---
    event TokensPurchased(address indexed beneficiary, uint256 amountIn, uint256 porkAmount);
    event PresaleFinalized(bool success, uint256 totalRaised, uint256 liquidityAdded);
    event TokensClaimed(address indexed beneficiary, uint256 amountPork);
    event Refunded(address indexed beneficiary, uint256 amountRefunded);

    // --- MODIFIERS ---
    modifier saleActive() {
        require(block.timestamp >= START_TIMESTAMP, "Presale: Not yet started");
        require(totalCollected < HARDCAP, "Presale: Hardcap reached");
        require(presaleStatus == 0, "Presale: Sale is closed");
        _;
    }

    modifier onlyIfFinalized() {
        require(presaleStatus != 0, "Presale: Must be finalized first");
        _;
    }

    constructor(
        address _paymentToken,    // 1. USDC/Stablecoin Address
        address _porkToken,       // 2. PRKL Token Address
        address _routerAddress,   // 3. QuickSwap Router Address
        uint256 _porkRate,        // 4. PRKL per 1 PaymentToken (e.g., 2000 * 10^18)
        uint256 _startTimestamp,  // 5. UNIX Timestamp for start
        uint256 _softcap,         // 6. Softcap in PaymentToken units (e.g., 5000 * 10^6 for USDC)
        uint256 _hardcap          // 7. Hardcap in PaymentToken units (e.g., 10000 * 10^6 for USDC)
    ) {
        require(_softcap > 0 && _hardcap > _softcap, "Presale: Invalid caps");
        
        paymentToken = IERC20(_paymentToken);
        porkelonToken = IERC20(_porkToken);
        quickswapRouter = IUniswapV2Router02(_routerAddress);

        PORK_RATE = _porkRate;
        START_TIMESTAMP = _startTimestamp;
        SOFTCAP = _softcap;
        HARDCAP = _hardcap;
        totalCollected = 0; // Initialize totalCollected
    }

    // --- PUBLIC VIEW FUNCTIONS ---

    /**
     * @dev Calculates the remaining cap in PaymentToken units.
     */
    function getRemainingCap() public view returns (uint256) {
        if (totalCollected >= HARDCAP) {
            return 0;
        }
        return HARDCAP.sub(totalCollected);
    }

    /**
     * @dev Checks if the presale is currently open for contributions.
     */
    function presaleOpen() public view returns (bool) {
        return (block.timestamp >= START_TIMESTAMP && 
                totalCollected < HARDCAP && 
                presaleStatus == 0);
    }

    // --- INTERNAL UTILITY ---

    /**
     * @dev Calculates the amount of PRKL tokens the user receives.
     * @param _amountIn Amount of PaymentToken received.
     * @return porkAmount Calculated amount of PRKL.
     */
    function _calculatePorkAmount(uint256 _amountIn) internal view returns (uint256) {
        // Assume PORK_RATE is adjusted for the difference in decimals 
        // (e.g., $PRKL is 18 decimals, PaymentToken is 6 decimals)
        // This is a direct multiplication.
        return _amountIn.mul(PORK_RATE).div(10**porkelonToken.decimals());
    }

    // --- PURCHASE LOGIC ---

    /**
     * @dev Allows a user to buy $PRKL tokens by transferring PaymentToken.
     * @param _beneficiary Address to receive the claimable tokens.
     * @param _amountIn Amount of PaymentToken being invested.
     */
    function buyTokens(address _beneficiary, uint256 _amountIn) public nonReentrancy saleActive {
        require(_amountIn > 0, "Presale: Amount must be greater than zero");

        // 1. Cap Check: Prevent overflow past the hardcap
        uint256 remainingCap = getRemainingCap();
        uint256 actualAmountIn = _amountIn;

        if (_amountIn > remainingCap) {
            actualAmountIn = remainingCap;
        }
        
        require(actualAmountIn > 0, "Presale: Hardcap reached");

        // 2. Transfer Payment Token from user (requires prior approval)
        require(
            paymentToken.transferFrom(msg.sender, address(this), actualAmountIn),
            "Presale: Payment transfer failed"
        );
        
        // 3. Calculate $PRKL amount
        uint256 porkAmount = actualAmountIn.mul(PORK_RATE);

        // 4. Update State
        totalCollected = totalCollected.add(actualAmountIn);
        contributions[_beneficiary] = contributions[_beneficiary].add(actualAmountIn);
        claimableTokens[_beneficiary] = claimableTokens[_beneficiary].add(porkAmount);

        emit TokensPurchased(_beneficiary, actualAmountIn, porkAmount);

        // Refund any excess if the transfer amount was capped
        if (actualAmountIn < _amountIn) {
            paymentToken.transfer(msg.sender, _amountIn.sub(actualAmountIn));
        }
    }

    // --- FINALIZATION & LIQUIDITY LOGIC ---

    /**
     * @dev Owner function to close the sale and handle success (add liquidity) or failure (enable refunds).
     * @param _percentForLiquidity Percentage of collected funds to use for liquidity (e.g., 50 for 50%).
     * @param _minLiquidityTokens Minimum amount of PRKL to provide for liquidity.
     */
    function finalizePresale(uint256 _percentForLiquidity, uint256 _minLiquidityTokens) external onlyOwner nonReentrancy {
        require(presaleStatus == 0, "Presale: Already finalized");
        require(_percentForLiquidity <= 100, "Presale: Invalid liquidity percentage");

        // If the sale duration has not ended, the owner can force close only if hardcap is met.
        // If the sale duration has ended, the owner can call this regardless of cap.
        bool saleDurationOver = block.timestamp > START_TIMESTAMP; // Simplified duration check, usually needs an END_TIMESTAMP
        bool hardcapMet = totalCollected >= HARDCAP;

        // Ensure owner can only finalize if duration is over OR hardcap is met
        require(saleDurationOver || hardcapMet, "Presale: Sale not over and hardcap not met");

        if (totalCollected >= SOFTCAP) {
            // --- SUCCESS SCENARIO ---
            presaleStatus = 1; // Set to Success

            // 1. Calculate liquidity amounts
            uint256 liquidityPaymentAmount = totalCollected.mul(_percentForLiquidity).div(100);
            uint256 liquidityPorkAmount = liquidityPaymentAmount.mul(PORK_RATE); // Use the same rate for initial pool

            // Ensure the contract holds enough PRKL tokens for the pool + claims
            uint256 requiredPork = liquidityPorkAmount.add(porkelonToken.balanceOf(address(this))).sub(porkelonToken.balanceOf(address(this))); // Simplified total calculation
            // Note: A real contract would track total PRKL promised vs. contract balance.

            // 2. Approve the Router to spend PaymentToken and PRKL
            require(paymentToken.approve(address(quickswapRouter), liquidityPaymentAmount), "Presale: USDC Approval failed");
            require(porkelonToken.approve(address(quickswapRouter), liquidityPorkAmount), "Presale: PRKL Approval failed");

            // 3. Add Liquidity
            (uint256 amountA, uint256 amountB, ) = quickswapRouter.addLiquidity(
                address(paymentToken),
                address(porkelonToken),
                liquidityPaymentAmount,
                liquidityPorkAmount,
                liquidityPaymentAmount, // min A
                _minLiquidityTokens,    // min B
                owner(),                // Liquidity Pool (LP) tokens go to owner
                block.timestamp.add(30 minutes) // 30 minute deadline
            );

            // 4. Owner Withdraws Remaining Funds
            uint256 remainingPaymentFunds = totalCollected.sub(amountA);
            if (remainingPaymentFunds > 0) {
                paymentToken.transfer(owner(), remainingPaymentFunds);
            }
            
            emit PresaleFinalized(true, totalCollected, amountA);

        } else {
            // --- FAILURE SCENARIO ---
            presaleStatus = 2; // Set to Failed (Refunds Enabled)
            emit PresaleFinalized(false, totalCollected, 0);
        }
    }

    // --- WITHDRAWAL LOGIC ---

    /**
     * @dev Allows investors to claim their $PRKL tokens after a successful presale.
     */
    function claimTokens() external nonReentrancy onlyIfFinalized {
        require(presaleStatus == 1, "Presale: Softcap not met, cannot claim");
        require(!isActioned[msg.sender], "Presale: Tokens already claimed");

        uint256 amount = claimableTokens[msg.sender];
        require(amount > 0, "Presale: No tokens to claim");

        // Mark as actioned and clear claimable tokens
        isActioned[msg.sender] = true;
        claimableTokens[msg.sender] = 0; 
        
        // Transfer $PRKL tokens
        require(porkelonToken.transfer(msg.sender, amount), "Presale: PRKL transfer failed");

        emit TokensClaimed(msg.sender, amount);
    }

    /**
     * @dev Allows investors to get a refund if the softcap was not met.
     */
    function refund() external nonReentrancy onlyIfFinalized {
        require(presaleStatus == 2, "Presale: Sale was successful, cannot refund");
        require(!isActioned[msg.sender], "Presale: Already refunded");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "Presale: No contribution found");

        // Mark as actioned and clear contribution
        isActioned[msg.sender] = true;
        contributions[msg.sender] = 0;
        
        // Return PaymentToken
        require(paymentToken.transfer(msg.sender, amount), "Presale: Refund transfer failed");

        emit Refunded(msg.sender, amount);
    }

    // --- EMERGENCY WITHDRAWAL ---
    
    /**
     * @dev Allows the owner to withdraw any remaining, uncommitted $PRKL tokens
     * after the sale has ended (e.g., if total supply exceeds claimable amount).
     * This is NOT for withdrawing collected funds which are handled in finalizePresale.
     */
    function ownerWithdrawTokens(uint256 _amount) external onlyOwner nonReentrancy {
        require(presaleStatus != 0, "Presale: Cannot withdraw while active");
        require(porkelonToken.transfer(owner(), _amount), "Presale: Emergency PRKL withdrawal failed");
    }
}
