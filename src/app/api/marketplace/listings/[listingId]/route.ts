import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MARKETPLACE_ABI = [
  'function listings(uint256) view returns (uint256 id, address seller, address nftContract, uint256 tokenId, uint256 quantity, uint256 remainingQuantity, uint256 pricePerItem, bool isErc1155, bool isActive, uint256 expiresAt, uint8 status)',
];

function toSafeNumber(value: bigint): number {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return asNumber;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const listingIdRaw = params.listingId;
    if (!/^\d+$/.test(listingIdRaw)) {
      return NextResponse.json(
        { error: 'listingId must be a positive integer string' },
        { status: 400 }
      );
    }

    const marketplaceAddress =
      process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || process.env.MARKETPLACE_CONTRACT_ADDRESS;
    if (!marketplaceAddress) {
      return NextResponse.json(
        { error: 'Marketplace contract address is not configured' },
        { status: 500 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider);

    const listing = await marketplace.listings(BigInt(listingIdRaw));

    if (!listing || listing.id === BigInt(0)) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const quantity = toSafeNumber(listing.quantity);
    const remainingQuantity = toSafeNumber(listing.remainingQuantity);
    const expiresAt = toSafeNumber(listing.expiresAt);
    const statusValue = Number(listing.status ?? 0);
    const statusMap: Record<number, string> = {
      0: 'active',
      1: 'sold_out',
      2: 'cancelled',
      3: 'expired',
    };
    const rawStatus = statusMap[statusValue] || 'unknown';
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredByTime = expiresAt > 0 && nowSeconds >= expiresAt;
    const resolvedStatus = rawStatus === 'active' && expiredByTime ? 'expired' : rawStatus;
    const isExpired = resolvedStatus === 'expired';
    const isCancelled = resolvedStatus === 'cancelled';
    const isSoldOut = resolvedStatus === 'sold_out' || (resolvedStatus === 'unknown' && remainingQuantity <= 0);
    const isActive = Boolean(listing.isActive);
    const isBuyable = isActive && !isExpired && !isCancelled && !isSoldOut;

    return NextResponse.json(
      {
        listing: {
          id: listing.id.toString(),
          seller: listing.seller,
          nft_contract: listing.nftContract,
          token_id: listing.tokenId.toString(),
          quantity,
          remaining_quantity: remainingQuantity,
          quantity_raw: listing.quantity.toString(),
          remaining_quantity_raw: listing.remainingQuantity.toString(),
          price_per_item_wei: listing.pricePerItem.toString(),
          is_erc1155: Boolean(listing.isErc1155),
          is_active: isActive,
          is_sold_out: isSoldOut,
          is_cancelled: isCancelled,
          is_expired: isExpired,
          is_buyable: isBuyable,
          status: resolvedStatus,
          expires_at: expiresAt,
          expires_at_raw: listing.expiresAt?.toString?.() || '0',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/marketplace/listings/[listingId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
