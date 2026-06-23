import type { RequestDb } from '@/lib/request-db';
import type { PoolClient } from 'pg';

/** Adapt a transaction client to RequestDb for use inside db.transaction callbacks. */
export function clientAsRequestDb(client: PoolClient): RequestDb {
  return {
    query: (text, params) => client.query(text, params),
    getClient: async () => client,
    transaction: async (callback) => callback(client),
  };
}
