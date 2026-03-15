# Blockchain Integration (Base Sepolia)

## 1. Network va contracts
- Network: Base Sepolia
- Contracts trong repo:
  - `contracts/nft721.sol`: ERC721 mint voi whitelist + mintEndTime
  - `contracts/nft1155.sol`: ERC1155 mint voi whitelist + mintEndTime
  - `contracts/marketplace.sol`: hien dang trong (chua co logic)

## 2. Hien trang code app
- UI co concept mint/list/buy
- Chua thay API route backend chinh thuc cho:
  - mint NFT
  - list NFT
  - buy NFT
- DB schema da san sang cho dong bo on-chain (`nfts`, `nft_listings`, `transactions`)

## 3. Minting flow (target)
1. User tao post (off-chain)
2. User ky tx mint tren Base Sepolia (ERC721 hoac ERC1155)
3. Nhan `tx_hash`, cho confirm N blocks
4. Doc event de lay `token_id`, `contract_address`
5. Ghi `nfts` + cap nhat `posts.is_nft`, `posts.nft_*`
6. Tao notification `nft_minted`

## 4. Listing flow (target)
1. Owner approve marketplace contract
2. Goi function list tren contract marketplace
3. Sau khi confirm, tao ban ghi `nft_listings` status `active`
4. Ghi `transactions` voi `transaction_type='list'`

## 5. Purchase flow (target)
1. Buyer submit buy tx
2. Confirm transfer ownership on-chain
3. Update `nft_listings.status='sold'`
4. Update `nfts.owner_id`
5. Ghi `transactions` voi `transaction_type='buy'`, `status='confirmed'`
6. Phat notification cho seller/buyer

## 6. Dong bo blockchain <-> database
Nguyen tac:
- DB chi xem la nguon su that sau khi tx confirmed
- Trang thai pending duoc luu tam trong `transactions.status='pending'`
- Worker/retry process can doi soat event va finality

De tranh mismatch:
- Idempotency key theo `(tx_hash, log_index)`
- Upsert theo unique `(contract_address, token_id)`
- Co co che reconcile jobs khi RPC fail

## 7. Security va reliability
- Validate chainId truoc khi ky
- Khong tin tokenId tu client; chi tin tu event log
- Chuan hoa dia chi vi lower-case/checksum nhat quan
- Timeout va retry strategy cho RPC provider

## 8. Constraint cho AI agents
Khi bo sung backend NFT/marketplace:
- Khong thay doi schema cot loi
- Bat buoc ghi `transactions` cho moi buoc on-chain
- Luon cap nhat cache invalidation khi listing status thay doi
