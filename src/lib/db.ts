import 'server-only';
import { Pool, QueryResult, QueryResultRow } from 'pg';

// Kiểm tra USE_LOCAL_DB để quyết định dùng PostgreSQL local hay Supabase
const useLocalDb = process.env.USE_LOCAL_DB === 'true';

// Tạo connection pool cho PostgreSQL local
let pool: Pool | null = null;

if (useLocalDb) {
  // Validate required environment variables
  const requiredEnvVars = [
    'LOCAL_DB_HOST',
    'LOCAL_DB_PORT',
    'LOCAL_DB_USER',
    'LOCAL_DB_PASSWORD',
    'LOCAL_DB_NAME'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Thiếu biến môi trường: ${missingVars.join(', ')}. ` +
      'Vui lòng kiểm tra file .env.local'
    );
  }

  pool = new Pool({
    host: process.env.LOCAL_DB_HOST,
    port: parseInt(process.env.LOCAL_DB_PORT!),
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  // Test connection khi khởi tạo
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

/**
 * Query database - tự động chọn PostgreSQL local hoặc Supabase
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (!useLocalDb) {
    throw new Error('USE_LOCAL_DB=false, hãy sử dụng Supabase client thay vì db.query()');
  }

  if (!pool) {
    throw new Error('PostgreSQL pool chưa được khởi tạo');
  }

  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log chi tiết query chỉ khi có biến môi trường DEBUG_DB=true
    if (process.env.DEBUG_DB === 'true') {
      console.log('Query executed:', { text: text.substring(0, 100), duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    // Chỉ log error khi có biến DEBUG_DB=true, nếu không chỉ throw
    if (process.env.DEBUG_DB === 'true') {
      console.error('Database query error:', error);
    }
    throw error;
  }
}

/**
 * Get a client from the pool for transaction
 */
export async function getClient() {
  if (!useLocalDb || !pool) {
    throw new Error('PostgreSQL pool không khả dụng');
  }
  return await pool.connect();
}

/**
 * Kiểm tra xem có đang dùng local DB không
 */
export function isUsingLocalDb(): boolean {
  return useLocalDb;
}

/**
 * Đóng connection pool (dùng khi shutdown app)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL pool đã đóng');
  }
}

// Export pool để sử dụng cho các trường hợp đặc biệt
export { pool };

export default {
  query,
  getClient,
  isUsingLocalDb,
  closePool,
  pool,
};
