// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract PorkelonNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 public nextTokenId;
    uint256 public maxSupply;
    bool public publicMintEnabled;
    uint256 public mintPrice;

    event Minted(address indexed minter, uint256 tokenId, string tokenURI);

    constructor(string memory name_, string memory symbol_, uint256 _maxSupply, uint96 defaultRoyaltyBps) ERC721(name_, symbol_) {
        maxSupply = _maxSupply;
        _setDefaultRoyalty(msg.sender, defaultRoyaltyBps);
    }

    function ownerMint(address to, string calldata tokenURI) external onlyOwner returns (uint256) {
        require(nextTokenId < maxSupply, "sold out");
        uint256 tid = ++nextTokenId;
        _safeMint(to, tid);
        _setTokenURI(tid, tokenURI);
        emit Minted(to, tid, tokenURI);
        return tid;
    }

    function publicMint(string calldata tokenURI) external payable returns (uint256) {
        require(publicMintEnabled, "public mint disabled");
        require(nextTokenId < maxSupply, "sold out");
        require(msg.value >= mintPrice, "insufficient ETH");
        uint256 tid = ++nextTokenId;
        _safeMint(msg.sender, tid);
        _setTokenURI(tid, tokenURI);
        emit Minted(msg.sender, tid, tokenURI);
        return tid;
    }

    function setPublicMintEnabled(bool v) external onlyOwner { publicMintEnabled = v; }
    function setMintPrice(uint256 p) external onlyOwner { mintPrice = p; }
    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        _setDefaultRoyalty(receiver, bps);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function withdraw(address payable to) external onlyOwner {
        to.transfer(address(this).balance);
    }
}
