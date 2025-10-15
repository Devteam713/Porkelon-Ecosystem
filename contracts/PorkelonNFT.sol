// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PorkelonNFT
 * @notice Mintable NFT with ERC2981 royalties, supports payment in PORK.
 */
contract PorkelonNFT is ERC721URIStorage, ERC2981, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public pork;
    uint256 public nextId;
    uint256 public maxSupply;
    bool public mintEnabled;
    uint256 public mintPrice;
    bool public payInPork;

    constructor(address _pork, uint256 _maxSupply, uint96 royaltyBps)
        ERC721("PorkelonNFT", "PNFT")
        Ownable(msg.sender)
    {
        pork = IERC20(_pork);
        maxSupply = _maxSupply;
        _setDefaultRoyalty(msg.sender, royaltyBps);
    }

    function mint(string calldata uri) external payable {
        require(mintEnabled, "mint disabled");
        require(nextId < maxSupply, "sold out");
        if (payInPork) {
            pork.safeTransferFrom(msg.sender, owner(), mintPrice);
        } else {
            require(msg.value >= mintPrice, "underpay");
        }
        nextId++;
        _safeMint(msg.sender, nextId);
        _setTokenURI(nextId, uri);
    }

    function setMintOptions(bool enabled, bool usePork, uint256 price) external onlyOwner {
        mintEnabled = enabled;
        payInPork = usePork;
        mintPrice = price;
    }

    function withdraw(address payable to) external onlyOwner {
        to.transfer(address(this).balance);
    }

    function supportsInterface(bytes4 id) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(id);
    }
}
