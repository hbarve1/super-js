// @superjs/types-connect — hand-curated SJS bindings for Connect 3.x core surface.

export type NextFunction = (err: dynamic) => void;

export type RequestHandler = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;

export type IncomingMessage {
  method: string;
  url: string;
  headers: dynamic;
}

export type ServerResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: dynamic): void;
  write(chunk: dynamic): void;
}

export type Server {
  use(handler: RequestHandler): Server;
  listen(port: number, callback: () => void): dynamic;
}

export type ConnectFactory = () => Server;
