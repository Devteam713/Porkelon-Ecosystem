// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PorkelonMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint96 public platformFeeBps = 250;
    address public feeRecipient;

    struct Listing {
        address seller;
        address nft;
        uint256 tokenId;
        address paymentToken;
        uint256 price;
        bool active;
    }

    uint256 public listingId;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 id, address seller, address nft, uint256 tokenId, uint256 price);
    event Sold(uint256 id, address buyer, uint256 price);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    function list(address nft, uint256 tokenId, address paymentToken, uint256 price) external nonReentrant {
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        listings[++listingId] = Listing(msg.sender, nft, tokenId, paymentToken, price, true);
        emit Listed(listingId, msg.sender, nft, tokenId, price);
    }

    function buy(uint256 id) external payable nonReentrant {
        Listing storage L = listings[id];
        require(L.active, "inactive");
        L.active = false;
        uint256 price = L.price;

        if (L.paymentToken == address(0)) {
            require(msg.value == price, "bad value");
            _payout(L.nft, L.tokenId, L.seller, price, address(0));
        } else {
            IERC20 token = IERC20(L.paymentToken);
            token.safeTransferFrom(msg.sender, address(this), price);
            _payout(L.nft, L.tokenId, L.seller, price, L.paymentToken);
        }

        IERC721(L.nft).transferFrom(address(this), msg.sender, L.tokenId);
        emit Sold(id, msg.sender, price);
    }

    function _payout(address nft, uint256 tokenId, address seller, uint256 amount, address token) internal {
        (address royaltyRec, uint256 royaltyAmt) = IERC2981(nft).royaltyInfo(tokenId, amount);
        uint256 fee = (amount * platformFeeBps) / 10_000;
        uint256 sellerAmt = amount - royaltyAmt - fee;

        if (token == address(0)) {
            payable(royaltyRec).transfer(royaltyAmt);
            payable(feeRecipient).transfer(fee);
            payable(seller).transfer(sellerAmt);
        } else {
            IERC20 t = IERC20(token);
            if (royaltyAmt > 0) t.safeTransfer(royaltyRec, royaltyAmt);
            if (fee > 0) t.safeTransfer(feeRecipient, fee);
            if (sellerAmt > 0) t.safeTransfer(seller, sellerAmt);
        }
    }
}
