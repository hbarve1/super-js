// @superjs/types-mongoose — hand-curated SJS bindings for Mongoose 8.x core surface.

export type SchemaOptions {
  collection: string;
  timestamps: boolean;
  strict: boolean;
}

export type Schema<T> {
  add(definition: dynamic): Schema<T>;
  index(fields: dynamic): Schema<T>;
}

export type Query<T> {
  exec(): Promise<T[]>;
  lean(): Query<T>;
  limit(n: number): Query<T>;
  sort(fields: dynamic): Query<T>;
}

export type QueryOne<T> {
  exec(): Promise<T | null>;
  lean(): QueryOne<T>;
}

export type Model<T> {
  find(filter: dynamic): Query<T>;
  findOne(filter: dynamic): QueryOne<T>;
  findById(id: string): QueryOne<T>;
  create(doc: dynamic): Promise<T>;
  updateOne(filter: dynamic, update: dynamic): Promise<dynamic>;
  updateMany(filter: dynamic, update: dynamic): Promise<dynamic>;
  countDocuments(filter: dynamic): Promise<number>;
}

export type Document {
  _id: dynamic;
  save(): Promise<dynamic>;
  toObject(): dynamic;
}

export type Connection {
  model<T>(name: string, schema: Schema<T>): Model<T>;
  close(): Promise<void>;
}

export type MongooseFactory = () => Connection;
