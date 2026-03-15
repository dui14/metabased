# Database

Nguon schema chinh:
- database/postgresupabase.sql

Luu y:
- Khong redesign schema
- Chi document quan he va cach su dung

Bang cot loi:
- users
- posts
- comments
- nfts
- nft_listings
- transactions
- notifications
- conversations
- messages
- follows
- likes
- reposts

Quan he nghiep vu chinh:
- users 1-n posts
- posts 1-n comments, likes, reposts
- users n-n users qua follows
- conversations rang buoc cap user duy nhat, messages thuoc conversation
- nfts gan voi post/creator/owner, listings va transactions theo doi giao dich

Count denormalization:
- users.followers_count/following_count qua trigger follows
- posts.likes_count/comments_count qua trigger likes/comments

RLS:
- Da enable tren cac bang chinh
- Server routes van phai enforce authz bo sung khi dung service role

Cach backend dang su dung:
- Da dung truc tiep: users, posts, likes, follows, conversations, messages
- Schema san sang nhung API con thieu: comments, notifications, nfts, nft_listings, transactions

