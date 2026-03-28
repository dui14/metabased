# Hardhat Deployment Guide - Base Sepolia

## Muc tieu
- Cai dat Hardhat trong project root
- Compile 3 smart contracts: `NFT721`, `NFT1155`, `Marketplace`
- Deploy len Base Sepolia
- Tu dong dong bo dia chi contract vao env cho FE/BE/API
- Smoke test API sau khi cap nhat cau hinh

## Da trien khai trong repo

### 1) Smart contracts
- `contracts/nft721.sol`
- `contracts/nft1155.sol`
- `contracts/marketplace.sol`

Marketplace da co cac chuc nang:
- Tao listing ERC721/ERC1155
- Huy listing
- Mua listing
- Phi nen tang (`platformFeeBps`)
- Rut phi cho owner

### 2) Hardhat setup
- `hardhat.config.js`
- `scripts/deploy-base-sepolia.js`
- Scripts trong `package.json` root:
  - `npm run contracts:clean`
  - `npm run contracts:compile`
  - `npm run contracts:test`
  - `npm run contracts:deploy:base-sepolia`

### 3) App env integration
Da bo sung bien cho contract address:
- Root `.env`
- `src/.env.local`
- `src/.env.example`

Bien duoc dong bo boi deploy script:
- `NEXT_PUBLIC_NFT721_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_NFT1155_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS`
- `NFT721_CONTRACT_ADDRESS`
- `NFT1155_CONTRACT_ADDRESS`
- `MARKETPLACE_CONTRACT_ADDRESS`

## Thong tin Base Sepolia (tu Base docs)
- Chain ID: `84532`
- RPC: `https://sepolia.base.org`
- Explorer: `https://sepolia-explorer.base.org` (tham khao chain), `https://sepolia.basescan.org` (verify/lookup transaction)

## Cach deploy that len Base Sepolia

### Buoc 1: Cap nhat `.env` root
Them cac bien sau:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
BASESCAN_API_KEY=YOUR_BASESCAN_KEY
```

Yeu cau:
- Vi deploy phai co ETH testnet tren Base Sepolia
- Private key khong duoc commit

### Buoc 2: Compile

```bash
npm run contracts:compile
```

### Buoc 3: Deploy

```bash
npm run contracts:deploy:base-sepolia
```

Ket qua sau deploy:
- Tao file `deployments/base-sepolia.json`
- Tu dong cap nhat dia chi contract vao `.env`, `src/.env.local`, `src/.env.example`

## Luu y bao mat
- Khong commit private key
- Khong commit service keys len public repo
- Khuyen nghi doi sang node provider co SLA cho production

## Troubleshooting

### Loi `Missing BASE_SEPOLIA_PRIVATE_KEY in .env`
- Them `BASE_SEPOLIA_PRIVATE_KEY` vao `.env` root theo dinh dang `0x...`

### Loi compile OpenZeppelin
- Da cau hinh compiler `0.8.24` va `evmVersion: cancun` trong `hardhat.config.js`

### Loi `ProviderError: replacement transaction underpriced`
- Nguyen nhan thuong gap: vi deploy dang co giao dich pending cu tren cung nonce
- Script deploy da duoc cap nhat de:
  - Lay nonce tu trang thai `pending`
  - Dat nonce tang dan cho tung contract deployment
  - Tang phi gas theo he so cau hinh
- Co the dieu chinh he so tang gas trong `.env`:

```env
BASE_SEPOLIA_GAS_BUMP_PERCENT=20
```

- Neu van loi, thu tang len `30` hoac `50` va chay lai deploy

### API app chua dung contract address moi
- Chay lai app sau khi deploy:

```bash
cd src
npm run dev
```

## Ghi chu quan trong
Lan deploy gan nhat da thanh cong tren Base Sepolia voi dia chi:
- `NFT721`: `0xF54db70Fa53Bd0B90a6FB6eb76569C988Bc47a15`
- `NFT1155`: `0xdcd8cF26892d47594789ff3Cb544e1c4462c819D`
- `Marketplace`: `0x7A24feA43A1e0DD6162EA49545139076Fb855BFa`

Chi tiet duoc luu tai `deployments/base-sepolia.json`.
