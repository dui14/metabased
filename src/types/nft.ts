// NFT types
export interface NFT {
  id: string;
  token_id: string;
  post_id: string;
  owner_address: string;
  creator_address: string;
  token_uri: string;
  price?: string;
  status: 'minted' | 'listed' | 'sold';
  contract_address: string;
  network: 'base-sepolia';
  created_at: string;
  updated_at: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
}
