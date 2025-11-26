// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

// Minimal Uniswap V2 Router Interface
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

/**
 * @title LiquidityManager
 * @dev Manages liquidity provision for Porkelon on Uniswap V2/QuickSwap.
 * Uses Ownable2Step for secure ownership transfer to the Timelock.
 */
contract Liquidity is Ownable2Step {
    using SafeERC20 for IERC20;

    IERC20 public immutable PORKELON;
    IUniswapV2Router02 public immutable ROUTER;

    event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityAddedETH(address indexed token, uint256 amountToken, uint256 amountETH, uint256 liquidity);

    /**
     * @param _porkelon The address of the Porkelon token.
     * @param _router The address of the Uniswap/QuickSwap V2 Router.
     */
    constructor(address _porkelon, address _router) Ownable2Step(msg.sender) {
        require(_porkelon != address(0), "Liquidity: Invalid token address");
        require(_router != address(0), "Liquidity: Invalid router address");

        PORKELON = IERC20(_porkelon);
        ROUTER = IUniswapV2Router02(_router);
    }

    /**
     * @notice Adds liquidity for PORKELON and another ERC20 token (e.g., USDT).
     */
    function addLiquidity(
        address tokenB,
        uint256 amountPork,
        uint256 amountTokenB,
        uint256 amountPorkMin,
        uint256 amountTokenBMin
    ) external onlyOwner {
        require(tokenB != address(0), "Liquidity: Invalid tokenB");
        require(amountPork > 0 && amountTokenB > 0, "Liquidity: Zero amounts");

        // OpenZeppelin 5.x forceApprove handles non-standard ERC20s safely
        PORKELON.forceApprove(address(ROUTER), amountPork);
        IERC20(tokenB).forceApprove(address(ROUTER), amountTokenB);

        (uint256 amountA, uint256 amountB, uint256 liquidity) = ROUTER.addLiquidity(
            address(PORKELON),
            tokenB,
            amountPork,
            amountTokenB,
            amountPorkMin,
            amountTokenBMin,
            address(this), // Liquidity Manager holds the LP tokens initially
            block.timestamp
        );

        emit LiquidityAdded(address(PORKELON), tokenB, amountA, amountB, liquidity);
    }

    /**
     * @notice Adds liquidity for PORKELON and Native Currency (MATIC/ETH).
     */
    function addLiquidityETH(
        uint256 amountPork,
        uint256 amountPorkMin,
        uint256 amountETHMin
    ) external payable onlyOwner {
        require(amountPork > 0, "Liquidity: Zero token amount");
        require(msg.value > 0, "Liquidity: Zero ETH amount");

        PORKELON.forceApprove(address(ROUTER), amountPork);

        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = ROUTER.addLiquidityETH{value: msg.value}(
            address(PORKELON),
            amountPork,
            amountPorkMin,
            amountETHMin,
            address(this), // Liquidity Manager holds the LP tokens initially
            block.timestamp
        );

        // Refund excess Native Currency
        if (msg.value > amountETH) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - amountETH}("");
            require(success, "Liquidity: ETH refund failed");
        }

        emit LiquidityAddedETH(address(PORKELON), amountToken, amountETH, liquidity);
    }

    /**
     * @notice Withdraws LP tokens (or any ERC20) to the owner (usually Timelock).
     */
    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Liquidity: Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Withdraws Native Currency to the owner.
     */
    function withdrawETH(address to) external onlyOwner {
        require(to != address(0), "Liquidity: Invalid recipient");
        (bool success, ) = payable(to).call{value: address(this).balance}("");
        require(success, "Liquidity: ETH transfer failed");
    }

    // Allows receiving ETH/MATIC (needed for refunds or direct deposits)
    receive() external payable {}
}
