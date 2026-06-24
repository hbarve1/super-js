// @superjs/types-prisma — narrow hand-curated SJS bindings for Prisma Client 5.x.

export type PrismaLogLevel = "info" | "query" | "warn" | "error";

export type PrismaClientOptions {
  datasources: dynamic;
  log: PrismaLogLevel[] | dynamic;
  errorFormat: "pretty" | "colorless" | "minimal";
}

export type PrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction(ops: dynamic): Promise<dynamic>;
  $queryRaw(sql: string, values: dynamic): Promise<dynamic>;
  $executeRaw(sql: string, values: dynamic): Promise<number>;
  $on(event: string, callback: dynamic): void;
}

export type PrismaClientFactory = (opts: PrismaClientOptions) => PrismaClient;
