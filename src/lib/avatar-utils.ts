/**
 * Avatar utilities
 * Xử lý random avatar cho người dùng mới
 */

// Danh sách avatars có sẵn trong /public/avatars
export const AVAILABLE_AVATARS = [
  'bear.png',
  'cat.png',
  'dog.png',
  'dragon.png',
  'duck.png',
  'giraffe.png',
  'gorilla.png',
  'koala.png',
  'panda.png',
  'rabbit.png',
] as const;

export type AvatarName = typeof AVAILABLE_AVATARS[number];

/**
 * Random chọn một avatar từ danh sách
 * @returns Tên file avatar (ví dụ: 'bear.png')
 */
export function getRandomAvatarName(): AvatarName {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_AVATARS.length);
  return AVAILABLE_AVATARS[randomIndex];
}

/**
 * Lấy URL đầy đủ của avatar
 * @param avatarName - Tên file avatar hoặc undefined để random
 * @returns URL đầy đủ (ví dụ: '/avatars/bear.png')
 */
export function getAvatarUrl(avatarName?: AvatarName | string): string {
  const name = avatarName || getRandomAvatarName();
  return `/avatars/${name}`;
}

/**
 * Random và lấy URL avatar mới
 * @returns URL đầy đủ của avatar random
 */
export function getRandomAvatarUrl(): string {
  return getAvatarUrl(getRandomAvatarName());
}

/**
 * Kiểm tra xem một URL có phải là avatar mặc định không
 * @param url - URL cần kiểm tra
 * @returns true nếu là avatar mặc định
 */
export function isDefaultAvatar(url?: string | null): boolean {
  if (!url) return true;
  return AVAILABLE_AVATARS.some(avatar => url.includes(avatar));
}

/**
 * Lấy tên avatar từ URL
 * @param url - URL avatar
 * @returns Tên file avatar hoặc null
 */
export function extractAvatarName(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/avatars\/([^/]+\.png)$/);
  return match ? match[1] : null;
}
