// @superjs/types-mysql2 — hand-curated SJS bindings for mysql2 3.x core surface.

export type PoolOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  waitForConnections: boolean;
}

export type RowDataPacket = dynamic;

export type FieldPacket = dynamic;

export type QueryResult = [RowDataPacket[], FieldPacket[]];

export type Connection {
  query(sql: string, params: dynamic): Promise<QueryResult>;
  execute(sql: string, params: dynamic): Promise<QueryResult>;
  release(): void;
  end(): Promise<void>;
}

export type Pool {
  query(sql: string, params: dynamic): Promise<QueryResult>;
  execute(sql: string, params: dynamic): Promise<QueryResult>;
  getConnection(): Promise<Connection>;
  end(): Promise<void>;
  on(event: string, listener: dynamic): Pool;
}

export type MysqlPoolFactory = (opts: PoolOptions) => Pool;
