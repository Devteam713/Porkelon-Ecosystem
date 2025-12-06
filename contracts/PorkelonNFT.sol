// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol"; 

contract PorkelonNFT is 
    ERC721URIStorage, 
    ERC2981, 
    Ownable, 
    Pausable, 
    ReentrancyGuard 
{
    // Hardcoded Royalty Receiver (Marketing Wallet)
    address private constant ROYALTY_RECEIVER = 0xcfe1F215D199b24F240711b3A7CF30453d8F4566;

    uint256 public nextTokenId;
    uint256 public immutable maxSupply;
    bool public publicMintEnabled;
    uint256 public mintPrice;
    uint96 private constant MAX_BPS = 10000;

    event Minted(address indexed minter, uint256 indexed tokenId, string tokenURI);
    event PublicMintToggled(bool enabled);
    event MintPriceUpdated(uint256 newPrice);
    event Withdrawn(address indexed to, uint256 amount);
    event DefaultRoyaltySet(address indexed receiver, uint96 bps);

    error SoldOut();
    error PublicMintDisabled();
    error InsufficientPayment(uint256 required, uint256 sent);
    error WithdrawFailed();
    error InvalidRoyaltyBps(uint96 bps);
    error ZeroAddress();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _maxSupply,
        uint96 defaultRoyaltyBps,
        address initialOwner
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        require(_maxSupply > 0, "maxSupply=0");
        if (defaultRoyaltyBps > MAX_BPS) revert InvalidRoyaltyBps(defaultRoyaltyBps);

        maxSupply = _maxSupply;
        // Set default royalty to hardcoded Marketing Wallet
        _setDefaultRoyalty(ROYALTY_RECEIVER, defaultRoyaltyBps);
    }

    function ownerMint(address to, string calldata tokenURI) external onlyOwner returns (uint256) {
        if (nextTokenId >= maxSupply) revert SoldOut();
        if (to == address(0)) revert ZeroAddress();

        uint256 tid = ++nextTokenId;
        _safeMint(to, tid);
        _setTokenURI(tid, tokenURI);
        emit Minted(to, tid, tokenURI);
        return tid;
    }

    function publicMint(string calldata tokenURI) external payable nonReentrant returns (uint256) {
        if (!publicMintEnabled) revert PublicMintDisabled();
        if (nextTokenId >= maxSupply) revert SoldOut();
        if (msg.value < mintPrice) revert InsufficientPayment(mintPrice, msg.value);

        uint256 tid = ++nextTokenId;
        _safeMint(msg.sender, tid);
        _setTokenURI(tid, tokenURI);
        emit Minted(msg.sender, tid, tokenURI);
        return tid;
    }

    function setPublicMintEnabled(bool v) external onlyOwner {
        publicMintEnabled = v;
        emit PublicMintToggled(v);
    }

    function setMintPrice(uint256 p) external onlyOwner {
        mintPrice = p;
        emit MintPriceUpdated(p);
    }

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        if (bps > MAX_BPS) revert InvalidRoyaltyBps(bps);
        _setDefaultRoyalty(receiver, bps);
        emit DefaultRoyaltySet(receiver, bps);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdraw(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        (bool sent, ) = to.call{value: bal}("");
        if (!sent) revert WithdrawFailed();
        emit Withdrawn(to, bal);
    }

    receive() external payable {}

    function totalSupply() external view returns (uint256) { return nextTokenId; }

    function _update(address to, uint256 tokenId, address auth) 
        internal virtual override(ERC721, ERC2981) returns (address) 
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            require(!paused(), "Pausable: transfers are paused");
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
