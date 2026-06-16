// Middleware Pattern Example

// Request and response types
type Request {
  path: string;
  method: string;
  headers: Record<string, string>;
  body: dynamic;
}

type Response {
  status: number;
  headers: Record<string, string>;
  body: dynamic;
}

// Middleware type
type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void>;

// Application class
class Application {
  #middlewares: Middleware[] = [];

  use(middleware: Middleware): void {
    this.#middlewares.push(middleware);
  }

  async handle(request: Request): Promise<Response> {
    const response: Response = {
      status: 200,
      headers: {},
      body: null
    };

    let currentMiddlewareIndex = 0;

    const next = async (): Promise<void> => {
      if (currentMiddlewareIndex < this.#middlewares.length) {
        const middleware = this.#middlewares[currentMiddlewareIndex];
        currentMiddlewareIndex++;
        await middleware(request, response, next);
      }
    };

    await next();
    return response;
  }
}

// Example middleware implementations
// Logger middleware
const logger: Middleware = async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  const startTime = Date.now();
  
  await next();
  
  const duration = Date.now() - startTime;
  console.log(`[${new Date().toISOString()}] Completed ${res.status} in ${duration}ms`);
};

// Authentication middleware
const auth: Middleware = async (req, res, next) => {
  const authToken = req.headers['authorization'];
  
  if (!authToken || authToken !== 'secret-token') {
    res.status = 401;
    res.body = { error: 'Unauthorized' };
    return;
  }
  
  await next();
};

// JSON body parser middleware
const jsonParser: Middleware = async (req, res, next) => {
  if (req.headers['content-type'] === 'application/json') {
    try {
      if (typeof req.body === 'string') {
        req.body = JSON.parse(req.body);
      }
    } catch (error) {
      res.status = 400;
      res.body = { error: 'Invalid JSON' };
      return;
    }
  }
  
  await next();
};

// Response time header middleware
const responseTime: Middleware = async (req, res, next) => {
  const start = process.hrtime();
  
  await next();
  
  const [seconds, nanoseconds] = process.hrtime(start);
  const duration = seconds * 1000 + nanoseconds / 1000000;
  res.headers['X-Response-Time'] = `${duration.toFixed(2)}ms`;
};

// Usage example
async function main(): Promise<void> {
  // Create application and add middleware
  const app = new Application();
  
  app.use(logger);
  app.use(responseTime);
  app.use(auth);
  app.use(jsonParser);

  // Example requests
  const requests: Request[] = [
    // Unauthorized request
    {
      path: '/api/data',
      method: 'GET',
      headers: {},
      body: null
    },
    // Authorized request with invalid JSON
    {
      path: '/api/data',
      method: 'POST',
      headers: {
        'authorization': 'secret-token',
        'content-type': 'application/json'
      },
      body: '{"invalid": json}'
    },
    // Valid authorized request
    {
      path: '/api/data',
      method: 'POST',
      headers: {
        'authorization': 'secret-token',
        'content-type': 'application/json'
      },
      body: '{"message": "Hello, World!"}'
    }
  ];

  // Process requests
  for (const request of requests) {
    console.log('\nProcessing request:', request);
    const response = await app.handle(request);
    console.log('Response:', response);
  }
}

main().catch(console.error);