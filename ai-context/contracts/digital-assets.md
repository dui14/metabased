# Digital Assets Sale Design (.zip via Marketplace Extension)

## Overview
Lua chon thiet ke: TICH HOP vao marketplace contract, khong tach contract rieng.

Ly do chon integrated model:
- Dong nhat fee logic ETH va event stream voi NFT sale
- Giam do phuc tap van hanh (mot contract giao dich)
- De index va dong bo Supabase transactions
- De mo rong sang bundle sale (NFT + zip access) trong tuong lai

Phan file .zip duoc luu off-chain (Supabase Storage), contract chi luu ownership va purchase proof on-chain.

## Contract Responsibilities
- Tao listing cho digital asset (khong bat buoc token ERC)
- Ghi nhan giao dich mua va ownership quyen truy cap
- Chia fee nen tang tuong tu NFT marketplace
- Emit event de backend cap quyen download

## State Variables
- digitalListingCounter
- digitalListings[digitalListingId]
- purchaseRights[assetId][buyer] = true
- assetSeller[assetId]
- assetPriceWei[assetId]
- assetActive[assetId]
- devWallet, platformFeeBps (dung chung voi marketplace)

Digital listing struct de xac dinh:
- digitalListingId
- assetId (bytes32, tao tu postId + fileCID hash)
- seller
- priceWei
- metadataURI (json mo ta san pham, khong chua file goc)
- status

## Core Functions (description only)
- createDigitalListing(assetId, priceWei, metadataURI)
  - Validate seller la owner business cua post/asset theo backend attest
  - Tao listing active
- buyDigitalAsset(digitalListingId)
  - Validate listing active
  - Validate msg.value
  - Tinh fee va chia ETH
  - Ghi purchaseRights[assetId][buyer] = true
  - Emit event purchase
- hasAccess(assetId, user)
  - Public view de backend/frontend check quyen
- cancelDigitalListing(digitalListingId)
  - Seller hoac owner huy listing

## Events
- DigitalListingCreated(digitalListingId, assetId, seller, priceWei, metadataURI)
- DigitalAssetPurchased(digitalListingId, assetId, buyer, totalPrice, feeAmount, sellerAmount)
- DigitalListingCancelled(digitalListingId, assetId, seller)
- DigitalAccessGranted(assetId, buyer)

## Access Control
- Owner:
  - Quan ly fee/wallet, pause/unpause toan marketplace
- Seller:
  - Tao/huy listing asset cua minh
- Buyer:
  - Mua bang ETH de nhan purchase right

## Flow Diagrams (text-based)
### Upload and Listing Flow (.zip)
1. Seller upload .zip len Supabase Storage bucket private
2. Backend tao file record trong Supabase: assetId, owner, storagePath, checksum
3. Backend goi createDigitalListing(assetId, priceWei, metadataURI)
4. Contract emit DigitalListingCreated
5. Worker cap nhat bang transactions/listings

### Purchase and Access Grant Flow
1. Buyer goi buyDigitalAsset voi ETH
2. Contract chia fee va set purchaseRights[assetId][buyer] = true
3. Contract emit DigitalAssetPurchased + DigitalAccessGranted
4. Backend listener nhan event, cap nhat purchase table
5. Buyer request download URL
6. Backend check hasAccess(assetId, buyerWallet)
7. Neu true, backend tao signed URL ngan han tu Supabase Storage
8. Buyer tai file qua signed URL

### Unauthorized Download Prevention Flow
1. User khong co purchase right goi API download
2. Backend check on-chain hasAccess = false
3. API tra 403, khong tao signed URL
4. Moi link da cap deu co TTL ngan, het han tu dong vo hieu

## Edge Cases
- Buyer da mua roi mua lai:
  - Co the cho phep nhu donation hoac chan double-purchase tuy business rule
- Seller cap nhat file sau khi da ban:
  - Versioning metadata can bat buoc, assetId moi cho version moi
- Event mua thanh cong nhung backend listener tre:
  - Access check fallback truc tiep on-chain tai thoi diem download
- Chia se URL trai phep:
  - Dung signed URL ngan han + bucket private + optional watermark

## Security Considerations
- Khong luu file .zip on-chain; chi luu proof ownership/purchase
- Supabase Storage bat buoc private bucket, khong public read
- Download API bat buoc verify wallet signature + ownership on-chain
- Ky signed URL voi TTL ngan (vi du 60-300 giay)
- Co the bo sung one-time download token de giam re-share
- MetadataURI khong chua direct storage path nhay cam
- Kiem tra checksum file khi upload de tranh thay doi file khong kiem soat
