// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PorkelonNFT
 * @dev The official NFT collection of the Porkelon Ecosystem.
 * Features: ERC721Enumerable, Auto-Increment IDs, Funds Withdrawal, Supply Cap.
 */
contract PorkelonNFT is ERC721, ERC721Enumerable, Ownable2Step, ReentrancyGuard {
    using Strings for uint256;

    // --- Configuration ---
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MAX_MINT_PER_TX = 10;
    uint256 public constant MAX_WALLET_LIMIT = 50;
    
    uint256 public mintPrice = 50 ether; // 50 MATIC (if on Polygon) or Native Unit
    string public baseURI;
    string public baseExtension = ".json";
    bool public paused = true;

    // --- Events ---
    event NFTMinted(address indexed minter, uint256 startTokenId, uint256 quantity);
    event BaseURIUpdated(string newBaseURI);
    event MintStatusChanged(bool isPaused);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI
    ) ERC721(_name, _symbol) Ownable2Step(msg.sender) {
        baseURI = _initBaseURI;
    }

    // --- Public Minting ---

    function mint(uint256 _quantity) public payable nonReentrant {
        require(!paused, "PorkelonNFT: Minting is paused");
        require(_quantity > 0 && _quantity <= MAX_MINT_PER_TX, "PorkelonNFT: Invalid quantity");
        require(totalSupply() + _quantity <= MAX_SUPPLY, "PorkelonNFT: Max supply exceeded");
        require(balanceOf(msg.sender) + _quantity <= MAX_WALLET_LIMIT, "PorkelonNFT: Wallet limit exceeded");
        require(msg.value >= mintPrice * _quantity, "PorkelonNFT: Insufficient funds");

        uint256 currentSupply = totalSupply();
        for (uint256 i = 0; i < _quantity; i++) {
            // Token IDs start at 1
            _safeMint(msg.sender, currentSupply + 1 + i);
        }

        emit NFTMinted(msg.sender, currentSupply + 1, _quantity);
    }

    // --- Admin Functions ---

    /**
     * @notice Mints NFTs for the team/marketing/giveaways (free).
     */
    function airdrop(address _to, uint256 _quantity) external onlyOwner {
        require(totalSupply() + _quantity <= MAX_SUPPLY, "PorkelonNFT: Max supply exceeded");
        
        uint256 currentSupply = totalSupply();
        for (uint256 i = 0; i < _quantity; i++) {
            _safeMint(_to, currentSupply + 1 + i);
        }
    }

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        mintPrice = _newPrice;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURIUpdated(_newBaseURI);
    }

    function setBaseExtension(string memory _newBaseExtension) external onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function setPaused(bool _state) external onlyOwner {
        paused = _state;
        emit MintStatusChanged(_state);
    }

    /**
     * @notice Withdraws collected funds to the owner (Timelock/Treasury).
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "PorkelonNFT: No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "PorkelonNFT: Withdrawal failed");
    }

    // --- View Functions ---

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);

        string memory currentBaseURI = baseURI;
        return bytes(currentBaseURI).length > 0
            ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), baseExtension))
            : "";
    }

    /**
     * @notice Returns list of Token IDs owned by a specific wallet.
     * Useful for frontend to display "My NFTs".
     */
    function walletOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    // --- Overrides (Required for ERC721Enumerable) ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
