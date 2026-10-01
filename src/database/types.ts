export type SqlParam = string | number | boolean | null;

export interface SqlResult<T = Record<string, unknown>> {
  rows: T[];
  rowsAffected: number;
  insertId?: number;
}

export interface SqlDb {
  execute<T = Record<string, unknown>>(
    query: string,
    params?: SqlParam[],
  ): SqlResult<T>;
  transaction<T>(work: (tx: SqlDb) => T): T;
}
