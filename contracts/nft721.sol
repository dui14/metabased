// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT721 is ERC721URIStorage, Ownable {
    address payable public constant DEV_WALLET = payable(0x7aDD236f981D2Dbc7261C226DeBe8914c96b8CdE);
    uint256 public tokenCounter;
    uint256 public mintFeeWei;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
    }

    function setMintFeeWei(uint256 newMintFeeWei) external onlyOwner {
        mintFeeWei = newMintFeeWei;
    }

    function mint(address to, string memory tokenURI, uint256 mintDeadline) external payable {
        if (mintDeadline != 0) {
            require(block.timestamp <= mintDeadline, "Mint expired");
        }
        require(msg.value == mintFeeWei, "Invalid mint fee");

        uint256 tokenId = ++tokenCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        if (msg.value > 0) {
            (bool sent, ) = DEV_WALLET.call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }
    }
}
