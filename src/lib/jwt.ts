import { createRemoteJWKSet, jwtVerify } from 'jose';

// URL JWKS từ Dynamic Labs
const JWKS_URL = process.env.DYNAMIC_JWKS_URL || 
  `https://app.dynamic.xyz/api/v0/sdk/${process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID}/.well-known/jwks`;

// Cache JWKS để không phải fetch mỗi lần
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

export interface JWTPayload {
  sub: string;           // User ID từ Dynamic
  sid: string;           // Session ID
  email?: string;        // Email (nếu có)
  environment_id: string;
  verified_credentials?: Array<{
    address?: string;    // Wallet address
    format: string;
    public_identifier?: string;
  }>;
  iat: number;           // Issued at
  exp: number;           // Expiration
  iss: string;           // Issuer
  aud: string;           // Audience
}

/**
 * Verify JWT token từ Dynamic Labs
 * @param token JWT token từ client
 * @returns Decoded payload hoặc null nếu không hợp lệ
 */
export async function verifyDynamicJWT(token: string): Promise<JWTPayload | null> {
  try {
    console.log('Verifying JWT token, length:', token?.length);
    const jwks = getJWKS();
    
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://app.dynamic.xyz/api/v0/environments/${process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID}`,
      audience: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
    });
    
    console.log('JWT verified successfully');
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.log('JWT verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Extract wallet address từ JWT payload
 */
export function getWalletFromJWT(payload: JWTPayload): string | null {
  const walletCredential = payload.verified_credentials?.find(
    cred => cred.format === 'blockchain' && cred.address
  );
  return walletCredential?.address || null;
}

/**
 * Verify JWT và trả về user info
 */
export async function verifyAndGetUser(token: string) {
  const payload = await verifyDynamicJWT(token);
  
  if (!payload) {
    return null;
  }
  
  return {
    userId: payload.sub,
    sessionId: payload.sid,
    email: payload.email,
    walletAddress: getWalletFromJWT(payload),
    environmentId: payload.environment_id,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000),
  };
}
