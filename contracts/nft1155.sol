// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT1155 is ERC1155, Ownable {
    address payable public constant DEV_WALLET = payable(0x7aDD236f981D2Dbc7261C226DeBe8914c96b8CdE);
    uint256 public currentTokenId;
    uint256 public mintFeeWei;

    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => string) private tokenURIs;

    constructor(string memory baseURI)
        ERC1155(baseURI)
        Ownable(msg.sender)
    {}

    function setMintFeeWei(uint256 newMintFeeWei) external onlyOwner {
        mintFeeWei = newMintFeeWei;
    }

    function mint(
        address to,
        uint256 amount,
        string memory tokenURI_,
        uint256 mintDeadline
    ) external payable {
        if (mintDeadline != 0) {
            require(block.timestamp <= mintDeadline, "Mint expired");
        }
        require(msg.value == mintFeeWei, "Invalid mint fee");

        uint256 tokenId = ++currentTokenId;
        totalSupply[tokenId] = amount;
        tokenURIs[tokenId] = tokenURI_;

        _mint(to, tokenId, amount, "");

        if (msg.value > 0) {
            (bool sent, ) = DEV_WALLET.call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }
}
