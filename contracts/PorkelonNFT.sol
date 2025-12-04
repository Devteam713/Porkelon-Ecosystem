// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol"; // <-- NEW IMPORT

/// @title PorkelonNFT
/// @notice ERC721 NFT contract with owner/public mint, ERC2981 royalties, secure withdraws, and transfer pausability.
/// @dev Implements Pausable for emergency transfer halting.
contract PorkelonNFT is 
    ERC721URIStorage, 
    ERC2981, 
    Ownable, 
    Pausable, // <-- NEW INHERITANCE
    ReentrancyGuard 
{
    // ---------------------------------------------------- //
    //                      STORAGE                         //
    // ---------------------------------------------------- //

    /// @notice Next token id to be minted. Tokens start at 1.
    uint256 public nextTokenId;

    /// @notice Maximum number of tokens that can be minted.
    uint256 public immutable maxSupply;

    /// @notice Whether public minting is enabled. (Separate from Pausable, which affects transfers)
    bool public publicMintEnabled;

    /// @notice Price required for public mint (in wei).
    uint256 public mintPrice;

    uint96 private constant MAX_BPS = 10000;

    // ---------------------------------------------------- //
    //                       EVENTS                         //
    // ---------------------------------------------------- //

    event Minted(address indexed minter, uint256 indexed tokenId, string tokenURI);
    event PublicMintToggled(bool enabled);
    event MintPriceUpdated(uint256 newPrice);
    event Withdrawn(address indexed to, uint256 amount);
    event DefaultRoyaltySet(address indexed receiver, uint96 bps);
    event TokenRoyaltySet(uint256 indexed tokenId, address indexed receiver, uint96 bps);
    event OwnerBatchMint(address indexed to, uint256[] tokenIds);
    // Pausable events are inherited

    // ---------------------------------------------------- //
    //                       ERRORS                         //
    // ---------------------------------------------------- //

    error SoldOut();
    error PublicMintDisabled();
    error InsufficientPayment(uint256 required, uint256 sent);
    error WithdrawFailed();
    error InvalidRoyaltyBps(uint96 bps);
    error ZeroAddress();

    // ---------------------------------------------------- //
    //                      CONSTRUCTOR                     //
    // ---------------------------------------------------- //

    /// @param name_ token name
    /// @param symbol_ token symbol
    /// @param _maxSupply maximum supply (must be > 0)
    /// @param defaultRoyaltyBps default royalty in basis points (0 - 10000)
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _maxSupply,
        uint96 defaultRoyaltyBps
    ) ERC721(name_, symbol_) {
        require(_maxSupply > 0, "maxSupply=0");
        if (defaultRoyaltyBps > MAX_BPS) revert InvalidRoyaltyBps(defaultRoyaltyBps);

        maxSupply = _maxSupply;
        // set default royalty for the contract owner initially
        _setDefaultRoyalty(msg.sender, defaultRoyaltyBps);
    }

    // ---------------------------------------------------- //
    //                       MINTING                        //
    // ---------------------------------------------------- //

    /// @notice Mint a token as the owner.
    function ownerMint(address to, string calldata tokenURI) external onlyOwner returns (uint256) {
        if (nextTokenId >= maxSupply) revert SoldOut();
        if (to == address(0)) revert ZeroAddress();

        uint256 tid = ++nextTokenId;
        _safeMint(to, tid);
        _setTokenURI(tid, tokenURI);

        emit Minted(to, tid, tokenURI);
        return tid;
    }

    /// @notice Batch mint for the owner (gas-efficient for airdrops).
    function ownerBatchMint(address to, string[] calldata tokenURIs) external onlyOwner returns (uint256[] memory) {
        uint256 count = tokenURIs.length;
        require(count > 0, "empty");
        if (nextTokenId + count > maxSupply) revert SoldOut();
        if (to == address(0)) revert ZeroAddress();

        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; ++i) {
            uint256 tid = ++nextTokenId;
            _safeMint(to, tid);
            _setTokenURI(tid, tokenURIs[i]);
            ids[i] = tid;
            emit Minted(to, tid, tokenURIs[i]);
        }

        emit OwnerBatchMint(to, ids);
        return ids;
    }

    /// @notice Public payable mint.
    /// @dev Requires publicMintEnabled and correct payment. Non-reentrant.
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

    // ---------------------------------------------------- //
    //                      ADMIN ACTIONS                   //
    // ---------------------------------------------------- //

    /// @notice Toggle public minting on/off.
    function setPublicMintEnabled(bool v) external onlyOwner {
        publicMintEnabled = v;
        emit PublicMintToggled(v);
    }

    /// @notice Set the public mint price (in wei).
    function setMintPrice(uint256 p) external onlyOwner {
        mintPrice = p;
        emit MintPriceUpdated(p);
    }

    /// @notice Update default royalty (bps relative to denominator 10000).
    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        if (bps > MAX_BPS) revert InvalidRoyaltyBps(bps);
        _setDefaultRoyalty(receiver, bps);
        emit DefaultRoyaltySet(receiver, bps);
    }

    /// @notice Set a per-token royalty.
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 bps) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        if (bps > MAX_BPS) revert InvalidRoyaltyBps(bps);
        _setTokenRoyalty(tokenId, receiver, bps);
        emit TokenRoyaltySet(tokenId, receiver, bps);
    }

    /// @notice Halt all token transfers (emergency pause).
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Re-enable all token transfers.
    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------- //
    //                      WITHDRAWALS                     //
    // ---------------------------------------------------- //

    /// @notice Withdraw contract balance to given address using call (safer than transfer).
    function withdraw(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        if (bal == 0) {
            emit Withdrawn(to, 0);
            return;
        }

        (bool sent, ) = to.call{value: bal}("");
        if (!sent) revert WithdrawFailed();
        emit Withdrawn(to, bal);
    }

    // Allow receiving ETH directly (e.g., someone sends funds by mistake).
    receive() external payable {}

    // ---------------------------------------------------- //
    //                    VIEWS / HELPERS                   //
    // ---------------------------------------------------- //

    /// @notice Current total minted supply (equal to last token id)
    function totalSupply() external view returns (uint256) {
        return nextTokenId;
    }

    // ---------------------------------------------------- //
    //                      OVERRIDES                       //
    // ---------------------------------------------------- //
    
    /// @dev Check if transfers are paused before executing any transfer (safeTransfer, transferFrom, etc.).
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 amount)
        internal
        virtual
        override(ERC721, ERC2981) // Added ERC2981 here as it sometimes uses this hook, though ERC721 is enough for the check.
    {
        // Allow minting (from == address(0)) and burning (to == address(0)) even when paused.
        // Pausing only affects actual transfers between users (from != 0 and to != 0).
        if (from != address(0) && to != address(0)) {
            require(!paused(), "Pausable: transfers are paused");
        }
        super._beforeTokenTransfer(from, to, tokenId, amount);
    }

    /// @dev Clear per-token royalty on burn and clear tokenURI (ERC721URIStorage).
    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        _resetTokenRoyalty(tokenId);
    }

    /// @dev tokenURI comes from ERC721URIStorage
    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @dev support ERC721, ERC2981, and Pausable interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
