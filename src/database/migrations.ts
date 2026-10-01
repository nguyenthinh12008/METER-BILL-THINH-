import type { SqlDb } from './types';
import { migrations } from './migrations.schema';

export function runMigrations(db: SqlDb): void {
  const versionResult = db.execute<{ user_version: number }>(
    'PRAGMA user_version;',
  );
  const currentVersion = versionResult.rows[0]?.user_version ?? 0;

  const pending = migrations
    .filter(migration => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    db.transaction(tx => {
      for (const statement of migration.statements) {
        tx.execute(statement);
      }
      // PRAGMA không hỗ trợ bind param cho giá trị — version đến từ mảng
      // migrations nội bộ (không phải input người dùng) nên interpolate an toàn.
      tx.execute(`PRAGMA user_version = ${migration.version};`);
    });
  }
}
