import Database from 'better-sqlite3';
import type { SqlDb, SqlParam, SqlResult } from '../database/types';
import { runMigrations } from '../database/migrations';

/**
 * SqlDb backed by better-sqlite3 (in-memory), dùng CHỈ trong test (devDependency,
 * không bao giờ bundle vào app). Dùng để test migrations.schema.ts và các
 * Repository mà không cần op-sqlite/native module hay emulator.
 */
export function createTestDb(): SqlDb {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const wrapper: SqlDb = {
    execute<T>(query: string, params: SqlParam[] = []): SqlResult<T> {
      const stmt = db.prepare(query);
      if (stmt.reader) {
        const rows = stmt.all(...params) as T[];
        return { rows, rowsAffected: 0 };
      }
      const info = stmt.run(...params);
      return {
        rows: [],
        rowsAffected: info.changes,
        insertId: Number(info.lastInsertRowid),
      };
    },
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

/** createTestDb() + đã áp toàn bộ migrations — dùng cho test repository. */
export function createMigratedTestDb(): SqlDb {
  const db = createTestDb();
  runMigrations(db);
  return db;
}
