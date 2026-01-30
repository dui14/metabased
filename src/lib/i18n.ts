// Language translations for the app

export type Language = 'en' | 'vi';

export const translations = {
  en: {
    // Common
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    loading: 'Loading...',
    delete: 'Delete',
    edit: 'Edit',
    share: 'Share',
    
    // Auth
    welcome: 'Welcome to Metabased!',
    setupProfile: 'Set up your profile to get started',
    username: 'Username',
    displayName: 'Display Name',
    bio: 'Bio',
    complete: 'Complete',
    walletAddress: 'Wallet Address',
    
    // Profile
    profile: 'Profile',
    editProfile: 'Edit Profile',
    follow: 'Follow',
    following: 'Following',
    followers: 'Followers',
    unfollow: 'Unfollow',
    unfollowUser: 'Unfollow User',
    unfollowConfirm: 'Are you sure you want to unfollow this user?',
    message: 'Message',
    posts: 'Posts',
    nfts: 'NFTs',
    nftsCreated: 'NFTs Created',
    noPosts: 'No posts yet',
    shareFirstMoment: 'Share your first moment',
    noNfts: 'No NFTs yet',
    mintPostsAsNft: 'Mint your posts as NFTs',
    joined: 'Joined',
    
    // Create Post
    createPost: 'Create Post',
    whatsOnYourMind: "What's on your mind?",
    uploadImage: 'Upload Image',
    imageFormat: 'PNG, JPG, GIF up to 10MB',
    post: 'Post',
    postAndMint: 'Post & Mint',
    mintAsNft: 'Mint as NFT',
    createNftOnBase: 'Create an NFT on Base Sepolia',
    setPrice: 'Set Price (ETH)',
    platformFee: 'Platform fee: 2.5%',
    youReceive: 'You receive',
    network: 'Network',
    gasFee: 'Gas Fee (estimated)',
    
    // Settings
    settings: 'Settings',
    personalInfo: 'Personal Information',
    appearance: 'Appearance',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    language: 'Language',
    english: 'English',
    vietnamese: 'Vietnamese',
    walletAndEmail: 'Wallet & Email',
    manageWalletEmail: 'Manage your connected wallet and email',
    currentWallet: 'Current Wallet',
    manageWallet: 'Manage Wallet & Email',
    logout: 'Logout',
    dangerZone: 'Danger Zone',
    usernameOnly: 'Only letters, numbers and underscores',
    characters: 'characters',
    
    // Validation
    usernameRequired: 'Username is required',
    usernameInvalid: 'Username must be 3-30 characters, only lowercase letters, numbers and underscores',
    usernameTaken: 'This username is already taken',
    usernameAvailable: 'Username is available',
    checking: 'Checking...',
    
    // Messages
    profileUpdated: 'Profile updated successfully!',
    errorOccurred: 'An error occurred',
    postNotFound: 'Post not found or has been deleted',
    userNotFound: 'User not found',
    urlCopied: 'URL copied to clipboard!',
    profileUrlCopied: 'Profile URL copied!',
    
    // Navigation
    home: 'Home',
    discover: 'Discover',
    create: 'Create',
    notifications: 'Notifications',
    messages: 'Messages',
    
    // Search & Discover
    search: 'Search',
    findUsers: 'Find users...',
    enterSearchQuery: 'Enter a search query to find users',
    noUsersFound: 'No users found',
    noUsersYet: 'No users yet',
    trendingTags: 'Trending Tags',
    suggestedForYou: 'Suggested for You',
  },
  vi: {
    // Common
    back: 'Quay lại',
    cancel: 'Hủy',
    save: 'Lưu',
    saving: 'Đang lưu...',
    loading: 'Đang tải...',
    delete: 'Xóa',
    edit: 'Chỉnh sửa',
    share: 'Chia sẻ',
    
    // Auth
    welcome: 'Chào mừng đến Metabased!',
    setupProfile: 'Hãy thiết lập profile của bạn để bắt đầu',
    username: 'Tên người dùng',
    displayName: 'Tên hiển thị',
    bio: 'Giới thiệu',
    complete: 'Hoàn tất',
    walletAddress: 'Địa chỉ ví',
    
    // Profile
    profile: 'Trang cá nhân',
    editProfile: 'Chỉnh sửa hồ sơ',
    follow: 'Theo dõi',
    following: 'Đang theo dõi',
    followers: 'Người theo dõi',
    unfollow: 'Bỏ theo dõi',
    unfollowUser: 'Bỏ theo dõi người dùng',
    unfollowConfirm: 'Bạn có chắc muốn bỏ theo dõi người dùng này?',
    message: 'Nhắn tin',
    posts: 'Bài viết',
    nfts: 'NFT',
    nftsCreated: 'NFT đã tạo',
    noPosts: 'Chưa có bài viết',
    shareFirstMoment: 'Hãy chia sẻ khoảnh khắc đầu tiên của bạn',
    noNfts: 'Chưa có NFT',
    mintPostsAsNft: 'Mint bài viết của bạn thành NFT',
    joined: 'Tham gia',
    
    // Create Post
    createPost: 'Tạo bài viết',
    whatsOnYourMind: 'Bạn đang nghĩ gì?',
    uploadImage: 'Tải ảnh lên',
    imageFormat: 'PNG, JPG, GIF tối đa 10MB',
    post: 'Đăng',
    postAndMint: 'Đăng & Mint',
    mintAsNft: 'Mint thành NFT',
    createNftOnBase: 'Tạo NFT trên Base Sepolia',
    setPrice: 'Đặt giá (ETH)',
    platformFee: 'Phí nền tảng: 2.5%',
    youReceive: 'Bạn nhận được',
    network: 'Mạng',
    gasFee: 'Phí gas (ước tính)',
    
    // Settings
    settings: 'Cài đặt',
    personalInfo: 'Thông tin cá nhân',
    appearance: 'Giao diện',
    lightMode: 'Chế độ sáng',
    darkMode: 'Chế độ tối',
    language: 'Ngôn ngữ',
    english: 'English',
    vietnamese: 'Tiếng Việt',
    walletAndEmail: 'Ví & Email',
    manageWalletEmail: 'Quản lý ví và email được kết nối với tài khoản của bạn',
    currentWallet: 'Ví hiện tại',
    manageWallet: 'Quản lý ví & email',
    logout: 'Đăng xuất',
    dangerZone: 'Vùng nguy hiểm',
    usernameOnly: 'Chỉ chứa chữ cái, số và dấu gạch dưới',
    characters: 'ký tự',
    
    // Validation
    usernameRequired: 'Tên người dùng là bắt buộc',
    usernameInvalid: 'Tên người dùng phải có 3-30 ký tự, chỉ bao gồm chữ thường, số và dấu gạch dưới',
    usernameTaken: 'Tên người dùng này đã được sử dụng',
    usernameAvailable: 'Tên người dùng có sẵn',
    checking: 'Đang kiểm tra...',
    
    // Messages
    profileUpdated: 'Đã cập nhật thông tin thành công!',
    errorOccurred: 'Có lỗi xảy ra',
    postNotFound: 'Bài viết không tồn tại hoặc đã bị xóa',
    userNotFound: 'Không tìm thấy người dùng',
    urlCopied: 'Đã sao chép URL!',
    profileUrlCopied: 'Đã sao chép URL trang cá nhân!',
    
    // Navigation
    home: 'Trang chủ',
    discover: 'Khám phá',
    create: 'Tạo mới',
    notifications: 'Thông báo',
    messages: 'Tin nhắn',
    
    // Search & Discover
    search: 'Tìm kiếm',
    findUsers: 'Tìm người dùng...',
    enterSearchQuery: 'Nhập từ khóa để tìm kiếm người dùng',
    noUsersFound: 'Không tìm thấy người dùng',
    noUsersYet: 'Chưa có người dùng',
    trendingTags: 'Hashtag thịnh hành',
    suggestedForYou: 'Đề xuất cho bạn',
  },
};

export type TranslationKey = keyof typeof translations.en;

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang][key] || translations.en[key] || key;
};
