// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PorkelonPresale
 * @dev Handles the sale of Porkelon tokens in exchange for native currency (MATIC/ETH) and a stablecoin (USDT).
 * The contract enforces a total token cap and handles token distribution.
 */
contract PorkelonPresale is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    // Token addresses
    IERC20 public immutable PORKELON_TOKEN;
    IERC20 public immutable PAYMENT_TOKEN; // e.g., USDT

    // Wallets
    address public immutable FUNDS_RECEIVER; // Wallet to receive collected MATIC/USDT

    // Rates and Caps (in PORK token decimals, typically 18)
    uint256 public immutable MATIC_RATE;  // PORK tokens received per 1 unit of native currency (1e18)
    uint256 public immutable USDT_RATE;   // PORK tokens received per 1 unit of payment token (e.g., 1e6 for 6-decimal USDT)
    uint256 public immutable PRESALE_CAP; // Total supply of PORK tokens reserved for the presale
    
    // Tracking
    uint256 public totalPorkSold;
    mapping(address => uint256) public contributions; // Buyer's contribution in USDT equivalent (for tracking)
    mapping(address => uint256) public tokenAllocations; // Tokens allocated to a buyer
    mapping(address => bool) public hasClaimed;

    // Time controls (to be set by the owner after deployment)
    uint256 public startTime;
    uint256 public endTime;


    // --- Events ---
    event TokensPurchased(address indexed buyer, uint256 nativePaid, uint256 stablePaid, uint256 tokensReceived);
    event TokensClaimed(address indexed buyer, uint256 tokensClaimed);
    event FundsWithdrawn(address indexed to, address token, uint256 amount);


    // --- Modifiers ---

    modifier onlyWhenActive() {
        require(block.timestamp >= startTime, "Presale: Sale has not started");
        require(block.timestamp <= endTime, "Presale: Sale has ended");
        _;
    }

    modifier onlyWhenEnded() {
        require(block.timestamp > endTime, "Presale: Sale is still active");
        _;
    }

    modifier onlyIfTokensRemaining(uint256 tokensToBuy) {
        require(totalPorkSold + tokensToBuy <= PRESALE_CAP, "Presale: Purchase exceeds remaining cap");
        _;
    }

    // --- Constructor ---

    /**
     * @param _porkelonToken Address of the Porkelon ERC20 token being sold.
     * @param _paymentToken Address of the stablecoin being accepted (e.g., USDT).
     * @param _fundsReceiver Wallet that receives all MATIC/USDT collected.
     * @param _maticRate PORK tokens received per 1e18 of native currency.
     * @param _usdtRate PORK tokens received per 1 unit of payment token (scaled to its decimals).
     * @param _presaleCap Total PORK tokens to be sold (in 18 decimals).
     */
    constructor(
        address _porkelonToken,
        address _paymentToken,
        address _fundsReceiver,
        uint256 _maticRate,
        uint256 _usdtRate,
        uint256 _presaleCap
    )
        Ownable2Step(msg.sender) // Deployer is initial owner, must transfer to Timelock
    {
        require(_fundsReceiver != address(0), "Presale: Invalid funds receiver");

        PORKELON_TOKEN = IERC20(_porkelonToken);
        PAYMENT_TOKEN = IERC20(_paymentToken);
        FUNDS_RECEIVER = _fundsReceiver;

        MATIC_RATE = _maticRate;
        USDT_RATE = _usdtRate;
        PRESALE_CAP = _presaleCap;
        
        // Initial PORK tokens must be transferred to this contract after deployment.
    }


    // --- Public Sale Functions ---

    /**
     * @notice Allows a user to purchase Porkelon tokens using the native currency (MATIC/ETH).
     * @dev Sends native currency to the FUNDS_RECEIVER wallet.
     */
    function buyWithNative() public payable nonReentrancy onlyWhenActive onlyIfTokensRemaining(
        msg.value * MATIC_RATE / 10**18 // Rate is PORK per 1e18 native unit
    ) {
        uint256 nativePaid = msg.value;
        require(nativePaid > 0, "Presale: Must send native currency");
        
        // Calculate tokens using the rate (PORK per 1e18 native currency)
        uint256 tokensToBuy = nativePaid * MATIC_RATE / 10**18;

        // Perform internal purchase and transfer native currency
        _processPurchase(msg.sender, tokensToBuy, nativePaid, 0);

        // Transfer collected native currency to the funds receiver wallet
        (bool success, ) = FUNDS_RECEIVER.call{value: nativePaid}("");
        require(success, "Presale: Native currency transfer failed");
    }

    /**
     * @notice Allows a user to purchase Porkelon tokens using the designated ERC20 payment token (e.g., USDT).
     * @param amount The amount of the PAYMENT_TOKEN the buyer wishes to spend.
     * @dev Buyer must call `approve` on the PAYMENT_TOKEN contract before calling this function.
     */
    function buyWithStable(uint256 amount) public nonReentrancy onlyWhenActive onlyIfTokensRemaining(
        amount * USDT_RATE / 10**PAYMENT_TOKEN.decimals() // Rate is PORK per 1 unit of PAYMENT_TOKEN
    ) {
        require(amount > 0, "Presale: Must send payment token");
        
        // Calculate tokens using the rate (PORK per 1 unit of payment token)
        // Need to scale the rate calculation based on the payment token's decimals.
        uint256 tokensToBuy = amount * USDT_RATE / (10**uint256(PAYMENT_TOKEN.decimals()));

        // Check the remaining cap again with the final calculated amount
        require(totalPorkSold + tokensToBuy <= PRESALE_CAP, "Presale: Purchase exceeds remaining cap");

        // Transfer stablecoin from the buyer to the presale contract
        PAYMENT_TOKEN.safeTransferFrom(msg.sender, address(this), amount);

        // Perform internal purchase and transfer stablecoin to the funds receiver
        _processPurchase(msg.sender, tokensToBuy, 0, amount);
        PAYMENT_TOKEN.safeTransfer(FUNDS_RECEIVER, amount);
    }

    /**
     * @notice Allows buyers to claim their allocated Porkelon tokens after the sale ends.
     */
    function claimTokens() public nonReentrancy onlyWhenEnded {
        require(tokenAllocations[msg.sender] > 0, "Presale: No tokens allocated");
        require(!hasClaimed[msg.sender], "Presale: Tokens already claimed");

        uint256 amountToClaim = tokenAllocations[msg.sender];
        
        // Mark the user as claimed and clear allocation
        tokenAllocations[msg.sender] = 0;
        hasClaimed[msg.sender] = true;

        // Transfer tokens to the buyer
        PORKELON_TOKEN.safeTransfer(msg.sender, amountToClaim);

        emit TokensClaimed(msg.sender, amountToClaim);
    }


    // --- Internal Logic ---

    /**
     * @dev Updates sale state variables and emits event.
     */
    function _processPurchase(
        address buyer,
        uint256 tokensToBuy,
        uint256 nativePaid,
        uint256 stablePaid
    ) internal {
        totalPorkSold += tokensToBuy;
        tokenAllocations[buyer] += tokensToBuy;
        
        // Record contribution in USDT equivalent (for external tracking if needed)
        // This is simplified for this example, assuming 1 USDT = 1 unit.
        contributions[buyer] += stablePaid; 

        emit TokensPurchased(buyer, nativePaid, stablePaid, tokensToBuy);
    }

    // --- Owner & Admin Functions ---

    /**
     * @notice Owner can set the start and end times for the presale.
     * @param _startTime Unix timestamp for when the sale begins.
     * @param _endTime Unix timestamp for when the sale ends.
     */
    function setSaleTiming(uint256 _startTime, uint256 _endTime) external onlyOwner {
        require(block.timestamp < _startTime, "Presale: Start time is in the past");
        require(_endTime > _startTime, "Presale: End time must be after start time");
        startTime = _startTime;
        endTime = _endTime;
    }

    /**
     * @notice Allows the owner to withdraw any remaining PORKELON_TOKEN after the sale ends.
     * This is used to return unsold tokens to the project's distribution wallet.
     */
    function withdrawUnsoldTokens(uint256 amount) external onlyOwner onlyWhenEnded {
        require(amount > 0, "Presale: Amount must be greater than zero");
        
        // The funds receiver is the project's treasury/distribution wallet
        PORKELON_TOKEN.safeTransfer(FUNDS_RECEIVER, amount);

        emit FundsWithdrawn(FUNDS_RECEIVER, address(PORKELON_TOKEN), amount);
    }

    /**
     * @notice Allows the owner to withdraw any accidentally sent ERC20 tokens other than PORK or the PAYMENT_TOKEN.
     * @param tokenAddress The address of the stuck ERC20 token.
     */
    function recoverERC20(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(PORKELON_TOKEN), "Presale: Cannot recover PORK token here");
        require(tokenAddress != address(PAYMENT_TOKEN), "Presale: Cannot recover PAYMENT token here");
        
        IERC20 stuckToken = IERC20(tokenAddress);
        stuckToken.safeTransfer(FUNDS_RECEIVER, stuckToken.balanceOf(address(this)));
    }
    
    // Fallback/Receive to accept native currency deposits
    receive() external payable {
        // Allow native currency deposits only through the buy function
        revert("Presale: Send native currency via buyWithNative()");
    }
}
