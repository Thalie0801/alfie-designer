import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
});

export async function q<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(sql, Array.from(params));
    return result;
  } finally {
    client.release();
  }
}

export function yyyymm(date = new Date()) {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}
