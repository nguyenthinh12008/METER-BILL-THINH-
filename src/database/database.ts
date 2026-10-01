import { open, type DB } from '@op-engineering/op-sqlite';
import type { SqlDb, SqlParam, SqlResult } from './types';

const DB_NAME = 'meterbill.db';

let nativeDb: DB | null = null;
let sqlDb: SqlDb | null = null;

function createSqlDb(db: DB): SqlDb {
  const wrapper: SqlDb = {
    execute<T>(query: string, params: SqlParam[] = []): SqlResult<T> {
      const result = db.executeSync(query, params);
      return {
        rows: (result.rows ?? []) as T[],
        rowsAffected: result.rowsAffected,
        insertId: result.insertId,
      };
    },
    // SQLite không hỗ trợ transaction lồng nhau — không gọi transaction() bên
    // trong một transaction() khác.
    transaction<T>(work: (tx: SqlDb) => T): T {
      wrapper.execute('BEGIN');
      try {
        const result = work(wrapper);
        wrapper.execute('COMMIT');
        return result;
      } catch (error) {
        wrapper.execute('ROLLBACK');
        throw error;
      }
    },
  };
  return wrapper;
}

export function getDatabase(): SqlDb {
  if (!sqlDb) {
    nativeDb = open({ name: DB_NAME });
    nativeDb.executeSync('PRAGMA foreign_keys = ON;');
    nativeDb.executeSync('PRAGMA journal_mode = WAL;');
    sqlDb = createSqlDb(nativeDb);
  }
  return sqlDb;
}

export function closeDatabase(): void {
  nativeDb?.close();
  nativeDb = null;
  sqlDb = null;
}
