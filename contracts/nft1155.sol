// Contract này dùng để mint NFT erc1155

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT1155 is ERC1155, Ownable {
    uint256 public currentTokenId;
    uint256 public mintEndTime;

    mapping(uint256 => uint256) public totalSupply;
    mapping(address => bool) public whitelist;
    mapping(uint256 => string) private tokenURIs;

    constructor(string memory baseURI, uint256 _mintEndTime)
        ERC1155(baseURI)
    {
        mintEndTime = _mintEndTime;
    }

    function setWhitelist(address user, bool allowed) external onlyOwner {
        whitelist[user] = allowed;
    }

    function mint(
        address to,
        uint256 amount,
        string memory tokenURI_
    ) external {
        require(block.timestamp <= mintEndTime, "Mint expired");
        require(whitelist[msg.sender] || msg.sender == owner(), "Not whitelisted");

        uint256 tokenId = ++currentTokenId;
        totalSupply[tokenId] = amount;
        tokenURIs[tokenId] = tokenURI_;

        _mint(to, tokenId, amount, "");
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }
}
