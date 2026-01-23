// Contract này dùng để mint NFT erc721

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT721 is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    uint256 public mintEndTime;
    mapping(address => bool) public whitelist;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _mintEndTime
    ) ERC721(name_, symbol_) {
        mintEndTime = _mintEndTime;
    }

    function setWhitelist(address user, bool allowed) external onlyOwner {
        whitelist[user] = allowed;
    }

    function mint(address to, string memory tokenURI) external {
        require(block.timestamp <= mintEndTime, "Mint expired");
        require(whitelist[msg.sender] || msg.sender == owner(), "Not whitelisted");

        uint256 tokenId = ++tokenCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }
}
