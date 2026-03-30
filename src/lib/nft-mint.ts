import { ethers } from 'ethers';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { isEthWalletConnector } from '@dynamic-labs/ethereum';
import { CONTRACTS, NETWORK } from '@/lib/constants';

export type MintContractType = 'ERC721' | 'ERC1155';

interface MintPostOnChainParams {
  postId: string;
  contractType: MintContractType;
  amount?: number;
  tokenURI?: string | null;
  mintDeadline?: string | null;
  walletConnector?: unknown;
}

interface MintPostOnChainResult {
  tokenId: string;
  mintTxHash: string;
  contractAddress: string;
}

interface PersistMintedPostParams {
  postId: string;
  contractType: MintContractType;
  contractAddress: string;
  tokenId: string;
  mintTxHash: string;
  listingTxHash?: string | null;
  listingId?: string | null;
  nftPrice?: string | null;
}

interface PersistMintedPostResponse {
  post: Record<string, unknown>;
  mint_tx_hash?: string;
  listing_tx_hash?: string;
  listing_id?: string;
  contract_type?: MintContractType;
}

export interface WalletOwnedNft {
  contractType: MintContractType;
  contractAddress: string;
  tokenId: string;
  amountOwned: number;
  tokenUri: string | null;
}

interface ScanWalletNftsOnBaseSepoliaParams {
  walletConnector?: unknown;
  limitPerContract?: number;
}

interface BuyListingOnChainParams {
  listingId: string;
  quantity?: number;
  unitPriceEth: string;
  walletConnector?: unknown;
}

interface BuyListingOnChainResult {
  txHash: string;
}

interface SellPostOnChainParams {
  contractType: MintContractType;
  contractAddress: string;
  tokenId: string;
  priceEth: string;
  amount?: number;
  walletConnector?: unknown;
}

interface SellPostOnChainResult {
  approvalTxHash: string;
  listingTxHash: string;
  listingId: string;
}

interface PersistPostListingParams {
  postId: string;
  contractType: MintContractType;
  contractAddress: string;
  tokenId: string;
  listingId: string;
  listingTxHash: string;
  nftPrice?: string | null;
}

interface PersistPostListingResponse {
  post: Record<string, unknown>;
  listing_tx_hash?: string;
  listing_id?: string;
  contract_type?: MintContractType;
}

const ERC721_ABI = [
  'function mint(address to, string tokenURI, uint256 mintDeadline) payable',
  'function mintFeeWei() view returns (uint256)',
  'function tokenCounter() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function approve(address to, uint256 tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

const ERC1155_ABI = [
  'function mint(address to, uint256 amount, string tokenURI_, uint256 mintDeadline) payable',
  'function mintFeeWei() view returns (uint256)',
  'function currentTokenId() view returns (uint256)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function uri(uint256 id) view returns (string)',
  'function setApprovalForAll(address operator, bool approved)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
];

const MARKETPLACE_ABI = [
  'function createListing(address nftContract, uint256 tokenId, uint256 quantity, uint256 pricePerItem, bool isErc1155) returns (uint256 listingId)',
  'function buyListing(uint256 listingId, uint256 quantity) payable',
  'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 quantity, uint256 pricePerItem, bool isErc1155)',
];

function getReadableError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { shortMessage?: string; reason?: string; message?: string };
    return maybeError.shortMessage || maybeError.reason || maybeError.message || 'Unknown error';
  }

  return 'Unknown error';
}

function normalizeAuthToken(token: unknown): string | null {
  if (typeof token !== 'string') {
    return null;
  }

  const normalized = token.trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return null;
  }

  return normalized;
}

async function resolveAuthToken(): Promise<string | null> {
  try {
    const dynamicToken = await Promise.resolve(getAuthToken());
    const normalizedDynamicToken = normalizeAuthToken(dynamicToken);
    if (normalizedDynamicToken) {
      return normalizedDynamicToken;
    }
  } catch {
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const fromAuthToken = normalizeAuthToken(localStorage.getItem('auth_token'));
  if (fromAuthToken) {
    return fromAuthToken;
  }

  return normalizeAuthToken(localStorage.getItem('dynamic_authentication_token'));
}

function getContractAddress(contractType: MintContractType): string {
  const contractAddress = contractType === 'ERC721'
    ? CONTRACTS.NFT_721
    : CONTRACTS.NFT_1155;

  if (!contractAddress || contractAddress === ethers.ZeroAddress) {
    throw new Error(`Missing contract address for ${contractType} in .env.local`);
  }

  return contractAddress;
}

function getMarketplaceAddress(): string {
  const marketplaceAddress = CONTRACTS.MARKETPLACE;

  if (!marketplaceAddress || marketplaceAddress === ethers.ZeroAddress) {
    throw new Error('Missing marketplace contract address in .env.local');
  }

  return marketplaceAddress;
}

function toChainIdHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

async function getProviderAndSigner(walletConnector?: unknown): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  signerAddress: string;
}> {
  let provider: ethers.BrowserProvider | null = null;
  let dynamicConnector: any = null;

  if (walletConnector && isEthWalletConnector(walletConnector as any)) {
    dynamicConnector = walletConnector as any;

    try {
      await dynamicConnector.switchNetwork?.({ networkChainId: NETWORK.chainId });
    } catch {
    }

    const dynamicWalletClient =
      dynamicConnector.getWalletClient?.(String(NETWORK.chainId)) ??
      dynamicConnector.getWalletClient?.();

    if (dynamicWalletClient && typeof dynamicWalletClient.request === 'function') {
      provider = new ethers.BrowserProvider(dynamicWalletClient as any);
    }

    if (!provider) {
      const dynamicSignerClient = await dynamicConnector.getSigner?.();
      if (dynamicSignerClient && typeof dynamicSignerClient.request === 'function') {
        provider = new ethers.BrowserProvider(dynamicSignerClient as any);
      }
    }
  }

  if (!provider) {
    if (typeof window === 'undefined') {
      throw new Error('Wallet is only available in browser context');
    }

    const ethereumProvider = (window as any).ethereum;
    if (!ethereumProvider) {
      throw new Error('Wallet not detected. Please connect a Dynamic-linked EVM wallet.');
    }

    provider = new ethers.BrowserProvider(ethereumProvider);
    await provider.send('eth_requestAccounts', []);
  }

  let network = await provider.getNetwork();
  if (Number(network.chainId) !== NETWORK.chainId) {
    if (dynamicConnector) {
      try {
        await dynamicConnector.switchNetwork?.({ networkChainId: NETWORK.chainId });
        network = await provider.getNetwork();
      } catch {
      }
    } else {
      try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: toChainIdHex(NETWORK.chainId) }]);
        network = await provider.getNetwork();
      } catch {
      }
    }
  }

  if (Number(network.chainId) !== NETWORK.chainId) {
    throw new Error(`Please switch wallet network to ${NETWORK.name} (chainId ${NETWORK.chainId})`);
  }

  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();

  return { provider, signer, signerAddress };
}

function parseMintDeadline(mintDeadline?: string | null): bigint {
  if (!mintDeadline) {
    return BigInt(0);
  }

  const parsed = Date.parse(mintDeadline);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid mint deadline format');
  }

  const timestamp = Math.floor(parsed / 1000);
  const now = Math.floor(Date.now() / 1000);

  if (timestamp <= now) {
    throw new Error('Mint deadline must be in the future');
  }

  return BigInt(timestamp);
}

function parsePriceToWei(priceEth: string): bigint {
  const normalized = priceEth.trim();
  if (!normalized) {
    throw new Error('NFT price is required');
  }

  try {
    return ethers.parseEther(normalized);
  } catch {
    throw new Error('Invalid NFT price');
  }
}

function extractTokenIdFromReceipt(
  contractType: MintContractType,
  receipt: ethers.TransactionReceipt,
  contractAddress: string
): string | null {
  const expectedAddress = contractAddress.toLowerCase();

  if (contractType === 'ERC721') {
    const iface = new ethers.Interface(ERC721_ABI);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== expectedAddress) {
        continue;
      }
      try {
        const parsed = iface.parseLog(log);
        if (
          parsed &&
          parsed.name === 'Transfer' &&
          String(parsed.args.from).toLowerCase() === ethers.ZeroAddress
        ) {
          return parsed.args.tokenId.toString();
        }
      } catch {
      }
    }
    return null;
  }

  const iface = new ethers.Interface(ERC1155_ABI);
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== expectedAddress) {
      continue;
    }
    try {
      const parsed = iface.parseLog(log);
      if (
        parsed &&
        parsed.name === 'TransferSingle' &&
        String(parsed.args.from).toLowerCase() === ethers.ZeroAddress
      ) {
        return parsed.args.id.toString();
      }
    } catch {
    }
  }
  return null;
}

function extractListingIdFromReceipt(
  receipt: ethers.TransactionReceipt,
  marketplaceAddress: string
): string | null {
  const expectedAddress = marketplaceAddress.toLowerCase();
  const iface = new ethers.Interface(MARKETPLACE_ABI);

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== expectedAddress) {
      continue;
    }

    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === 'ListingCreated') {
        return parsed.args.listingId.toString();
      }
    } catch {
    }
  }

  return null;
}

export async function mintPostOnChain({
  postId,
  contractType,
  amount = 1,
  tokenURI = null,
  mintDeadline = null,
  walletConnector,
}: MintPostOnChainParams): Promise<MintPostOnChainResult> {
  if (typeof window === 'undefined') {
    throw new Error('Minting is only available in browser context');
  }

  const contractAddress = getContractAddress(contractType);
  const mintDeadlineEpoch = parseMintDeadline(mintDeadline);

  const { signer, signerAddress } = await getProviderAndSigner(walletConnector);
  const tokenUri = tokenURI || `${window.location.origin}/post/${postId}`;

  let mintTx: ethers.ContractTransactionResponse;

  try {
    if (contractType === 'ERC721') {
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, signer);
      const mintFeeWei = (await contract.mintFeeWei()) as bigint;
      mintTx = await contract.mint(signerAddress, tokenUri, mintDeadlineEpoch, { value: mintFeeWei });
    } else {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Invalid amount for ERC1155. Amount must be a positive integer.');
      }
      const contract = new ethers.Contract(contractAddress, ERC1155_ABI, signer);
      const mintFeeWei = (await contract.mintFeeWei()) as bigint;
      mintTx = await contract.mint(signerAddress, BigInt(amount), tokenUri, mintDeadlineEpoch, { value: mintFeeWei });
    }
  } catch (error) {
    throw new Error(`Failed to submit mint transaction: ${getReadableError(error)}`);
  }

  const receipt = await mintTx.wait();
  if (!receipt) {
    throw new Error('Mint transaction did not return a receipt');
  }

  const tokenId = extractTokenIdFromReceipt(contractType, receipt, contractAddress);
  if (!tokenId) {
    throw new Error('Mint transaction succeeded but tokenId could not be extracted from logs');
  }

  return {
    tokenId,
    mintTxHash: receipt.hash,
    contractAddress,
  };
}

export async function persistMintedPost({
  postId,
  contractType,
  contractAddress,
  tokenId,
  mintTxHash,
  listingTxHash,
  listingId,
  nftPrice = null,
}: PersistMintedPostParams): Promise<PersistMintedPostResponse> {
  const token = await resolveAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api/posts/${postId}/mint`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      contract_type: contractType,
      contract_address: contractAddress,
      token_id: tokenId,
      mint_tx_hash: mintTxHash,
      listing_tx_hash: listingTxHash,
      listing_id: listingId,
      nft_price: nftPrice,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to persist minted post data');
  }

  return data;
}

export async function sellPostOnChain({
  contractType,
  contractAddress,
  tokenId,
  priceEth,
  amount = 1,
  walletConnector,
}: SellPostOnChainParams): Promise<SellPostOnChainResult> {
  if (typeof window === 'undefined') {
    throw new Error('Selling is only available in browser context');
  }

  const marketplaceAddress = getMarketplaceAddress();
  const listingPriceWei = parsePriceToWei(priceEth);
  const parsedTokenId = BigInt(tokenId);
  const { signer } = await getProviderAndSigner(walletConnector);

  let approvalTxHash = '';
  try {
    if (contractType === 'ERC721') {
      const nft721 = new ethers.Contract(contractAddress, ERC721_ABI, signer);
      const approvalTx = await nft721.approve(marketplaceAddress, parsedTokenId);
      const approvalReceipt = await approvalTx.wait();
      if (!approvalReceipt) {
        throw new Error('Approve transaction did not return a receipt');
      }
      approvalTxHash = approvalReceipt.hash;
    } else {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Invalid amount for ERC1155. Amount must be a positive integer.');
      }

      const nft1155 = new ethers.Contract(contractAddress, ERC1155_ABI, signer);
      const approvalTx = await nft1155.setApprovalForAll(marketplaceAddress, true);
      const approvalReceipt = await approvalTx.wait();
      if (!approvalReceipt) {
        throw new Error('setApprovalForAll transaction did not return a receipt');
      }
      approvalTxHash = approvalReceipt.hash;
    }
  } catch (error) {
    throw new Error(`Failed to approve marketplace: ${getReadableError(error)}`);
  }

  try {
    const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    const quantityForListing = contractType === 'ERC1155' ? BigInt(amount) : BigInt(1);

    const listingTx = await marketplace.createListing(
      contractAddress,
      parsedTokenId,
      quantityForListing,
      listingPriceWei,
      contractType === 'ERC1155'
    );

    const listingReceipt = await listingTx.wait();
    if (!listingReceipt) {
      throw new Error('Create listing transaction did not return a receipt');
    }

    const listingId = extractListingIdFromReceipt(listingReceipt, marketplaceAddress);
    if (!listingId) {
      throw new Error('Create listing transaction succeeded but listingId could not be extracted from logs');
    }

    return {
      approvalTxHash,
      listingTxHash: listingReceipt.hash,
      listingId,
    };
  } catch (error) {
    throw new Error(`Failed to create listing: ${getReadableError(error)}`);
  }
}

export async function persistPostListing({
  postId,
  contractType,
  contractAddress,
  tokenId,
  listingId,
  listingTxHash,
  nftPrice = null,
}: PersistPostListingParams): Promise<PersistPostListingResponse> {
  const token = await resolveAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api/posts/${postId}/listing`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      contract_type: contractType,
      contract_address: contractAddress,
      token_id: tokenId,
      listing_id: listingId,
      listing_tx_hash: listingTxHash,
      nft_price: nftPrice,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to persist post listing data');
  }

  return data;
}

export async function buyPostListingOnChain({
  listingId,
  quantity = 1,
  unitPriceEth,
  walletConnector,
}: BuyListingOnChainParams): Promise<BuyListingOnChainResult> {
  if (typeof window === 'undefined') {
    throw new Error('Buying is only available in browser context');
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Invalid quantity');
  }

  const marketplaceAddress = getMarketplaceAddress();
  const unitPriceWei = parsePriceToWei(unitPriceEth);
  const totalPrice = unitPriceWei * BigInt(quantity);

  const { signer } = await getProviderAndSigner(walletConnector);
  const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);

  try {
    const tx = await marketplace.buyListing(BigInt(listingId), BigInt(quantity), { value: totalPrice });
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Buy transaction did not return a receipt');
    }

    return { txHash: receipt.hash };
  } catch (error) {
    throw new Error(`Failed to buy listing: ${getReadableError(error)}`);
  }
}

export async function scanWalletNftsOnBaseSepolia({
  walletConnector,
  limitPerContract = 300,
}: ScanWalletNftsOnBaseSepoliaParams = {}): Promise<WalletOwnedNft[]> {
  const { signer, signerAddress } = await getProviderAndSigner(walletConnector);
  const provider = signer.provider;

  if (!provider) {
    throw new Error('Provider is not available from connected wallet');
  }

  const walletAddress = signerAddress.toLowerCase();
  const maxScan = Math.max(1, Math.min(1000, Math.trunc(limitPerContract)));
  const owned: WalletOwnedNft[] = [];

  const erc721Address = getContractAddress('ERC721');
  const erc721Contract = new ethers.Contract(erc721Address, ERC721_ABI, provider);
  const erc721Total = Number(await erc721Contract.tokenCounter());
  const erc721UpperBound = Math.min(erc721Total, maxScan);

  for (let tokenId = 1; tokenId <= erc721UpperBound; tokenId += 1) {
    try {
      const owner = String(await erc721Contract.ownerOf(BigInt(tokenId))).toLowerCase();
      if (owner !== walletAddress) {
        continue;
      }

      let tokenUri: string | null = null;
      try {
        tokenUri = String(await erc721Contract.tokenURI(BigInt(tokenId)));
      } catch {
        tokenUri = null;
      }

      owned.push({
        contractType: 'ERC721',
        contractAddress: erc721Address,
        tokenId: tokenId.toString(),
        amountOwned: 1,
        tokenUri,
      });
    } catch {
    }
  }

  const erc1155Address = getContractAddress('ERC1155');
  const erc1155Contract = new ethers.Contract(erc1155Address, ERC1155_ABI, provider);
  const erc1155Total = Number(await erc1155Contract.currentTokenId());
  const erc1155UpperBound = Math.min(erc1155Total, maxScan);

  for (let tokenId = 1; tokenId <= erc1155UpperBound; tokenId += 1) {
    try {
      const balance = await erc1155Contract.balanceOf(walletAddress, BigInt(tokenId));
      const amountOwned = Number(balance);
      if (!Number.isFinite(amountOwned) || amountOwned <= 0) {
        continue;
      }

      let tokenUri: string | null = null;
      try {
        tokenUri = String(await erc1155Contract.uri(BigInt(tokenId)));
      } catch {
        tokenUri = null;
      }

      owned.push({
        contractType: 'ERC1155',
        contractAddress: erc1155Address,
        tokenId: tokenId.toString(),
        amountOwned,
        tokenUri,
      });
    } catch {
    }
  }

  owned.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
  return owned;
}
