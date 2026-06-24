// @superjs/types-redis — hand-curated SJS bindings for ioredis 5.x / redis 4.x core surface.

export type RedisOptions {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
  lazyConnect: boolean;
}

export type Redis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  mget(keys: string[]): Promise<(string | null)[]>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<dynamic>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<number>;
  pipeline(): RedisPipeline;
  quit(): Promise<string>;
  disconnect(): void;
  on(event: string, listener: dynamic): Redis;
}

export type RedisPipeline {
  get(key: string): RedisPipeline;
  set(key: string, value: string): RedisPipeline;
  exec(): Promise<dynamic>;
}

export type RedisFactory = (opts: RedisOptions) => Redis;
