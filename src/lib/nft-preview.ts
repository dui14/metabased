import { ethers } from 'ethers';
import { NETWORK } from '@/lib/constants';
import type { MintContractType } from '@/lib/nft-mint';

const ERC721_URI_ABI = ['function tokenURI(uint256 tokenId) view returns (string)'];
const ERC1155_URI_ABI = ['function uri(uint256 id) view returns (string)'];

export interface NftPreviewData {
	tokenUri: string | null;
	metadataUrl: string | null;
	imageUrl: string | null;
	name: string | null;
}

interface ResolveNftPreviewParams {
	contractType?: MintContractType | null;
	contractAddress?: string | null;
	tokenId?: string | null;
	tokenUriHint?: string | null;
}

function tryDecodeDataUri(input: string): string | null {
	if (!input.startsWith('data:application/json')) {
		return null;
	}

	const commaIndex = input.indexOf(',');
	if (commaIndex === -1) {
		return null;
	}

	const header = input.slice(0, commaIndex);
	const payload = input.slice(commaIndex + 1);

	try {
		if (header.includes(';base64')) {
			if (typeof window !== 'undefined') {
				return window.atob(payload);
			}
			return Buffer.from(payload, 'base64').toString('utf-8');
		}

		return decodeURIComponent(payload);
	} catch {
		return null;
	}
}

function normalizeIpfsUrl(input: string): string {
	if (input.startsWith('ipfs://ipfs/')) {
		return `https://ipfs.io/ipfs/${input.slice('ipfs://ipfs/'.length)}`;
	}

	if (input.startsWith('ipfs://')) {
		return `https://ipfs.io/ipfs/${input.slice('ipfs://'.length)}`;
	}

	return input;
}

function normalizeUri(input: string): string {
	const decoded = tryDecodeDataUri(input);
	if (decoded !== null) {
		return input;
	}

	return normalizeIpfsUrl(input.trim());
}

function looksLikeImageUrl(input: string): boolean {
	if (!input) {
		return false;
	}

	if (input.startsWith('data:image/')) {
		return true;
	}

	const normalized = normalizeIpfsUrl(input).toLowerCase();
	return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)(\?|#|$)/.test(normalized);
}

function toErc1155TokenHex(tokenId: string): string {
	const rawHex = BigInt(tokenId).toString(16);
	return rawHex.padStart(64, '0');
}

function expandErc1155Template(uri: string, tokenId: string): string {
	if (!uri.includes('{id}')) {
		return uri;
	}

	try {
		return uri.replace('{id}', toErc1155TokenHex(tokenId));
	} catch {
		return uri;
	}
}

function extractImageFromMetadata(metadata: Record<string, unknown>): string | null {
	const candidates = [
		metadata.image,
		metadata.image_url,
		metadata.thumbnail,
		metadata.thumbnail_url,
		metadata.animation_url,
	];

	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim()) {
			return normalizeIpfsUrl(candidate.trim());
		}
	}

	return null;
}

async function fetchMetadataFromUri(uri: string): Promise<{ metadataUrl: string | null; imageUrl: string | null; name: string | null }> {
	const normalized = normalizeUri(uri);
	const decodedInline = tryDecodeDataUri(normalized);

	if (decodedInline !== null) {
		try {
			const parsed = JSON.parse(decodedInline) as Record<string, unknown>;
			return {
				metadataUrl: null,
				imageUrl: extractImageFromMetadata(parsed),
				name: typeof parsed.name === 'string' ? parsed.name : null,
			};
		} catch {
			return { metadataUrl: null, imageUrl: null, name: null };
		}
	}

	if (looksLikeImageUrl(normalized)) {
		return {
			metadataUrl: null,
			imageUrl: normalized,
			name: null,
		};
	}

	try {
		const response = await fetch(normalized, { cache: 'no-store' });
		if (!response.ok) {
			return { metadataUrl: normalized, imageUrl: null, name: null };
		}

		const parsed = (await response.json()) as Record<string, unknown>;
		return {
			metadataUrl: normalized,
			imageUrl: extractImageFromMetadata(parsed),
			name: typeof parsed.name === 'string' ? parsed.name : null,
		};
	} catch {
		return { metadataUrl: normalized, imageUrl: null, name: null };
	}
}

async function readTokenUriFromChain(
	contractType: MintContractType,
	contractAddress: string,
	tokenId: string
): Promise<string | null> {
	try {
		const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl, NETWORK.chainId);

		if (contractType === 'ERC721') {
			const contract = new ethers.Contract(contractAddress, ERC721_URI_ABI, provider);
			const uri = await contract.tokenURI(BigInt(tokenId));
			return typeof uri === 'string' ? uri : null;
		}

		const contract = new ethers.Contract(contractAddress, ERC1155_URI_ABI, provider);
		const uri = await contract.uri(BigInt(tokenId));
		if (typeof uri !== 'string') {
			return null;
		}

		return expandErc1155Template(uri, tokenId);
	} catch {
		return null;
	}
}

export function formatTokenIdHex(tokenId?: string | null): string {
	if (!tokenId) {
		return '-';
	}

	const raw = tokenId.trim();
	if (!raw) {
		return '-';
	}

	if (raw.startsWith('0x')) {
		return raw;
	}

	try {
		return `0x${BigInt(raw).toString(16)}`;
	} catch {
		return raw;
	}
}

export function formatTokenIdShort(tokenId?: string | null): string {
	const normalized = formatTokenIdHex(tokenId);
	if (normalized === '-' || normalized.length <= 11) {
		return normalized;
	}

	return `${normalized.slice(0, 6)}...${normalized.slice(-3)}`;
}

export async function resolveNftPreview({
	contractType,
	contractAddress,
	tokenId,
	tokenUriHint,
}: ResolveNftPreviewParams): Promise<NftPreviewData> {
	const normalizedHint = typeof tokenUriHint === 'string' && tokenUriHint.trim() ? tokenUriHint.trim() : null;

	let tokenUri = normalizedHint;

	if (!tokenUri && contractType && contractAddress && tokenId) {
		tokenUri = await readTokenUriFromChain(contractType, contractAddress, tokenId);
	}

	if (!tokenUri) {
		return {
			tokenUri: null,
			metadataUrl: null,
			imageUrl: null,
			name: null,
		};
	}

	const metadata = await fetchMetadataFromUri(tokenUri);

	return {
		tokenUri,
		metadataUrl: metadata.metadataUrl,
		imageUrl: metadata.imageUrl,
		name: metadata.name,
	};
}
