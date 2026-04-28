declare module 'pg' {
  export type QueryResultRow = Record<string, unknown>;

  export type QueryResult<T extends QueryResultRow = QueryResultRow> = {
    rows: T[];
    rowCount: number;
  };

  export class Pool {
    constructor(config?: {
      connectionString?: string;
      ssl?: { rejectUnauthorized: boolean } | undefined;
    });

    query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ): Promise<QueryResult<T>>;
  }
}
