import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '@/lib/constants';

export type MintContractType = 'ERC721' | 'ERC1155';

interface MintPostOnChainParams {
  postId: string;
  contractType: MintContractType;
  amount?: number;
}

interface MintPostOnChainResult {
  tokenId: string;
  txHash: string;
  contractAddress: string;
}

interface PersistMintedPostParams {
  postId: string;
  contractType: MintContractType;
  contractAddress: string;
  tokenId: string;
  txHash: string;
  nftPrice?: string | null;
}

interface PersistMintedPostResponse {
  post: Record<string, unknown>;
  tx_hash?: string;
  contract_type?: MintContractType;
}

const ERC721_ABI = [
  'function mint(address to, string tokenURI) payable',
  'function mintFeeWei() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

const ERC1155_ABI = [
  'function mint(address to, uint256 amount, string tokenURI_) payable',
  'function mintFeeWei() view returns (uint256)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
];

function getReadableError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
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

export async function mintPostOnChain({
  postId,
  contractType,
  amount = 1,
}: MintPostOnChainParams): Promise<MintPostOnChainResult> {
  if (typeof window === 'undefined') {
    throw new Error('Minting is only available in browser context');
  }

  const ethereumProvider = (window as any).ethereum;
  if (!ethereumProvider) {
    throw new Error('Wallet not detected. Please install a wallet extension.');
  }

  const contractAddress = getContractAddress(contractType);

  const provider = new ethers.BrowserProvider(ethereumProvider);
  await provider.send('eth_requestAccounts', []);

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== NETWORK.chainId) {
    throw new Error(`Please switch wallet network to ${NETWORK.name} (chainId ${NETWORK.chainId})`);
  }

  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  const tokenUri = `${window.location.origin}/post/${postId}`;

  let tx: ethers.ContractTransactionResponse;

  try {
    if (contractType === 'ERC721') {
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, signer);
      const mintFeeWei = (await contract.mintFeeWei()) as bigint;
      tx = await contract.mint(signerAddress, tokenUri, { value: mintFeeWei });
    } else {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Invalid amount for ERC1155. Amount must be a positive integer.');
      }
      const contract = new ethers.Contract(contractAddress, ERC1155_ABI, signer);
      const mintFeeWei = (await contract.mintFeeWei()) as bigint;
      tx = await contract.mint(signerAddress, BigInt(amount), tokenUri, { value: mintFeeWei });
    }
  } catch (error) {
    throw new Error(`Failed to submit mint transaction: ${getReadableError(error)}`);
  }

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error('Mint transaction did not return a receipt');
  }

  const tokenId = extractTokenIdFromReceipt(contractType, receipt, contractAddress);
  if (!tokenId) {
    throw new Error('Mint transaction succeeded but tokenId could not be extracted from logs');
  }

  return {
    tokenId,
    txHash: receipt.hash,
    contractAddress,
  };
}

export async function persistMintedPost({
  postId,
  contractType,
  contractAddress,
  tokenId,
  txHash,
  nftPrice = null,
}: PersistMintedPostParams): Promise<PersistMintedPostResponse> {
  const response = await fetch(`/api/posts/${postId}/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract_type: contractType,
      contract_address: contractAddress,
      token_id: tokenId,
      tx_hash: txHash,
      nft_price: nftPrice,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to persist minted post data');
  }

  return data;
}
