---
sidebar_position: 3
---

# Examples

This page showcases practical examples of Super.js usage, from basic syntax to advanced patterns.

## Basic Examples

### Hello World

```javascript
// hello.sjs
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const message = greet("World");
console.log(message);
```

### Type Inference

```javascript
// types.sjs
// Super.js automatically infers types
const numbers = [1, 2, 3, 4, 5]; // number[]
const names = ["Alice", "Bob", "Charlie"]; // string[]
const mixed = [1, "hello", true]; // (number | string | boolean)[]

// Object type inference
const user = {
  name: "John",
  age: 30,
  email: "john@example.com"
}; // { name: string, age: number, email: string }

// Function type inference
const add = (a: number, b: number) => a + b; // (a: number, b: number) => number
```

### Classes and Interfaces

```javascript
// classes.sjs
interface Vehicle {
  brand: string;
  model: string;
  year: number;
  start(): void;
}

class Car implements Vehicle {
  constructor(
    public brand: string,
    public model: string,
    public year: number
  ) {}

  start(): void {
    console.log(`${this.brand} ${this.model} is starting...`);
  }

  getInfo(): string {
    return `${this.year} ${this.brand} ${this.model}`;
  }
}

const myCar = new Car("Toyota", "Camry", 2020);
myCar.start();
console.log(myCar.getInfo());
```

## Advanced Examples

### Generics

```javascript
// generics.sjs
interface Repository<T> {
  find(id: number): T | null;
  save(item: T): void;
  delete(id: number): boolean;
  findAll(): T[];
}

class UserRepository implements Repository<User> {
  private users: User[] = [];

  find(id: number): User | null {
    return this.users.find(user => user.id === id) || null;
  }

  save(user: User): void {
    const existingIndex = this.users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      this.users[existingIndex] = user;
    } else {
      this.users.push(user);
    }
  }

  delete(id: number): boolean {
    const index = this.users.findIndex(user => user.id === id);
    if (index >= 0) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }

  findAll(): User[] {
    return [...this.users];
  }
}

// Generic utility function
function createRepository<T>(): Repository<T> {
  return {
    find: () => null,
    save: () => {},
    delete: () => false,
    findAll: () => []
  };
}
```

### Async/Await with Error Handling

```javascript
// async.sjs
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        data,
        status: response.status,
        message: "Success"
      };
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        data,
        status: response.status,
        message: "Success"
      };
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }
}

// Usage
const api = new ApiClient('https://api.example.com');

async function fetchUsers() {
  try {
    const response = await api.get<User[]>('/users');
    console.log('Users:', response.data);
  } catch (error) {
    console.error('Failed to fetch users:', error.message);
  }
}
```

### JSX Components

```javascript
// components.sjs
interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

function Button({ text, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const disabledClass = disabled ? 'btn-disabled' : '';
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${disabledClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
}

function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>Email: {user.email}</p>
      <p>Age: {user.age}</p>
      <div className="actions">
        <Button 
          text="Edit" 
          onClick={() => onEdit(user)}
          variant="secondary"
        />
        <Button 
          text="Delete" 
          onClick={() => onDelete(user.id)}
          variant="danger"
        />
      </div>
    </div>
  );
}
```

## Design Patterns

### Observer Pattern

```javascript
// observer.sjs
interface Observer<T> {
  update(data: T): void;
}

interface Subject<T> {
  attach(observer: Observer<T>): void;
  detach(observer: Observer<T>): void;
  notify(data: T): void;
}

class EventEmitter<T> implements Subject<T> {
  private observers: Observer<T>[] = [];

  attach(observer: Observer<T>): void {
    this.observers.push(observer);
  }

  detach(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notify(data: T): void {
    this.observers.forEach(observer => observer.update(data));
  }
}

// Usage
class Logger implements Observer<string> {
  update(message: string): void {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  }
}

class EmailNotifier implements Observer<string> {
  update(message: string): void {
    console.log(`[EMAIL] Sending notification: ${message}`);
  }
}

const eventEmitter = new EventEmitter<string>();
const logger = new Logger();
const emailNotifier = new EmailNotifier();

eventEmitter.attach(logger);
eventEmitter.attach(emailNotifier);

eventEmitter.notify("User logged in");
```

### Factory Pattern

```javascript
// factory.sjs
interface Animal {
  name: string;
  makeSound(): string;
}

class Dog implements Animal {
  constructor(public name: string) {}
  
  makeSound(): string {
    return "Woof!";
  }
}

class Cat implements Animal {
  constructor(public name: string) {}
  
  makeSound(): string {
    return "Meow!";
  }
}

class Bird implements Animal {
  constructor(public name: string) {}
  
  makeSound(): string {
    return "Tweet!";
  }
}

type AnimalType = 'dog' | 'cat' | 'bird';

class AnimalFactory {
  static createAnimal(type: AnimalType, name: string): Animal {
    switch (type) {
      case 'dog':
        return new Dog(name);
      case 'cat':
        return new Cat(name);
      case 'bird':
        return new Bird(name);
      default:
        throw new Error(`Unknown animal type: ${type}`);
    }
  }
}

// Usage
const animals = [
  AnimalFactory.createAnimal('dog', 'Rex'),
  AnimalFactory.createAnimal('cat', 'Whiskers'),
  AnimalFactory.createAnimal('bird', 'Polly')
];

animals.forEach(animal => {
  console.log(`${animal.name} says: ${animal.makeSound()}`);
});
```

## Utility Examples

### Type Guards and Validation

```javascript
// validation.sjs
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function validateUser(data: unknown): data is User {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const user = data as any;
  
  return (
    isString(user.name) &&
    isString(user.email) &&
    isEmail(user.email) &&
    (user.age === undefined || isNumber(user.age))
  );
}

// Usage
function processUserData(data: unknown): User | null {
  if (validateUser(data)) {
    return data;
  }
  return null;
}
```

### Higher-Order Functions

```javascript
// hof.sjs
type Predicate<T> = (item: T) => boolean;
type Mapper<T, U> = (item: T) => U;
type Reducer<T, U> = (accumulator: U, item: T) => U;

function filter<T>(array: T[], predicate: Predicate<T>): T[] {
  return array.filter(predicate);
}

function map<T, U>(array: T[], mapper: Mapper<T, U>): U[] {
  return array.map(mapper);
}

function reduce<T, U>(array: T[], reducer: Reducer<T, U>, initial: U): U {
  return array.reduce(reducer, initial);
}

// Usage with type safety
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const evenNumbers = filter(numbers, n => n % 2 === 0);
const doubled = map(evenNumbers, n => n * 2);
const sum = reduce(doubled, (acc, n) => acc + n, 0);

console.log(`Sum of doubled even numbers: ${sum}`);
```

These examples demonstrate the power and flexibility of Super.js while maintaining type safety and ECMA compliance. Each example can be compiled and run using the Super.js compiler. 
