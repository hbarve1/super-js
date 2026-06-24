// @superjs/types-pg — hand-curated SJS bindings for node-postgres 8.x core surface.

export type QueryResult<R> {
  rows: R[];
  rowCount: number;
  command: string;
}

export type PoolConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean | dynamic;
  max: number;
}

export type QueryConfig {
  text: string;
  values: dynamic;
}

export type PoolClient {
  query(sql: string, params: dynamic): Promise<QueryResult<dynamic>>;
  query(config: QueryConfig): Promise<QueryResult<dynamic>>;
  release(err: dynamic): void;
}

export type Pool {
  query(sql: string, params: dynamic): Promise<QueryResult<dynamic>>;
  query(config: QueryConfig): Promise<QueryResult<dynamic>>;
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
  on(event: string, listener: dynamic): Pool;
}

export type PgPoolFactory = (config: PoolConfig) => Pool;
