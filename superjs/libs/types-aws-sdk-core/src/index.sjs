// @superjs/types-aws-sdk-core — narrow SJS bindings for AWS SDK v3 client core.

export type AwsCredentialIdentity {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export type ClientDefaults {
  region: string;
  credentials: AwsCredentialIdentity | dynamic;
  maxAttempts: number;
}

export type Command {
  input: dynamic;
  resolveMiddleware(stack: MiddlewareStack, config: dynamic, opts: dynamic): dynamic;
}

export type MiddlewareStack {
  add(middleware: dynamic, opts: dynamic): void;
  clone(): MiddlewareStack;
}

export type SmithyClient {
  config: ClientDefaults;
  send(command: Command): Promise<dynamic>;
  destroy(): void;
}

export type ServiceClientFactory = (config: ClientDefaults) => SmithyClient;
