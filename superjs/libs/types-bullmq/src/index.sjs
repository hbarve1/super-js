// @superjs/types-bullmq — hand-curated SJS bindings for BullMQ 5.x core surface.

export type JobsOptions {
  delay: number;
  attempts: number;
  priority: number;
  removeOnComplete: boolean | number;
  removeOnFail: boolean | number;
}

export type Job<T> {
  id: string;
  name: string;
  data: T;
  progress: number;
  updateProgress(progress: number): Promise<void>;
  moveToCompleted(returnvalue: dynamic, token: string): Promise<void>;
  moveToFailed(err: dynamic, token: string): Promise<void>;
}

export type QueueOptions {
  connection: dynamic;
  defaultJobOptions: JobsOptions;
}

export type Queue<T> {
  name: string;
  add(name: string, data: T, opts: JobsOptions): Promise<Job<T>>;
  getJob(id: string): Promise<Job<T> | null>;
  close(): Promise<void>;
  obliterate(opts: dynamic): Promise<void>;
}

export type Processor<T> = (job: Job<T>) => Promise<dynamic>;

export type WorkerOptions {
  connection: dynamic;
  concurrency: number;
}

export type Worker<T> {
  on(event: string, handler: dynamic): Worker<T>;
  close(): Promise<void>;
  run(): Promise<void>;
}
