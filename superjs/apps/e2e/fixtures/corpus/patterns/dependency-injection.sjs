// Dependency Injection Example

// Service interfaces
type Logger {
  log(message: string): void;
  error(message: string): void;
}

type Storage {
  get(key: string): string?;
  set(key: string, value: string): void;
}

type UserService {
  getCurrentUser(): string?;
  login(username: string): void;
  logout(): void;
}

// Service implementations
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}

class LocalStorage implements Storage {
  #storage: Map<string, string> = new Map();

  get(key: string): string? {
    return this.#storage.get(key) || null;
  }

  set(key: string, value: string): void {
    this.#storage.set(key, value);
  }
}

class UserServiceImpl implements UserService {
  #logger: Logger;
  #storage: Storage;

  constructor(logger: Logger, storage: Storage) {
    this.#logger = logger;
    this.#storage = storage;
  }

  getCurrentUser(): string? {
    const user = this.#storage.get('currentUser');
    this.#logger.log(`Getting current user: ${user}`);
    return user;
  }

  login(username: string): void {
    this.#logger.log(`Logging in user: ${username}`);
    this.#storage.set('currentUser', username);
  }

  logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.#logger.log(`Logging out user: ${user}`);
      this.#storage.set('currentUser', '');
    }
  }
}

// Dependency container
class Container {
  #services: Map<string, dynamic> = new Map();

  register<T>(token: string, service: T): void {
    this.#services.set(token, service);
  }

  resolve<T>(token: string): T {
    const service = this.#services.get(token);
    if (!service) {
      throw new Error(`Service not found: ${token}`);
    }
    return service;
  }
}

// Application class using dependency injection
class Application {
  #userService: UserService;

  constructor(userService: UserService) {
    this.#userService = userService;
  }

  run(): void {
    console.log('Starting application...\n');

    // Simulate user interactions
    console.log('Current user:', this.#userService.getCurrentUser());
    
    this.#userService.login('john_doe');
    console.log('Current user:', this.#userService.getCurrentUser());
    
    this.#userService.logout();
    console.log('Current user:', this.#userService.getCurrentUser());
  }
}

// Usage example
function main(): void {
  // Setup dependency container
  const container = new Container();

  // Register services
  container.register<Logger>('logger', new ConsoleLogger());
  container.register<Storage>('storage', new LocalStorage());
  container.register<UserService>(
    'userService',
    new UserServiceImpl(
      container.resolve('logger'),
      container.resolve('storage')
    )
  );

  // Create and run application
  const app = new Application(container.resolve('userService'));
  app.run();
}

main();