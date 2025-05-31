/**
 * SuperJS Classes and Interfaces Examples
 * 
 * This file demonstrates classes and interfaces in SuperJS.
 */

// Basic Interface
interface Identifiable {
  id: number | string;
  name: string;
}

// Interface with optional properties
interface UserProfile {
  email: string;
  username: string;
  bio?: string;         // Optional property
  website?: string;     // Optional property
}

// Interface extending another interface
interface Employee extends Identifiable {
  department: string;
  salary: number;
  hireDate: Date;
}

// Interface with readonly properties
interface Configuration {
  readonly apiKey: string;
  readonly maxRetries: number;
  readonly timeout: number;
}

// Interface with method definitions
interface Calculator {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
  multiply(a: number, b: number): number;
  divide(a: number, b: number): number;
}

// Basic class
class User implements Identifiable {
  id: number;
  name: string;
  
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
  
  toString(): string {
    return `User ${this.id}: ${this.name}`;
  }
}

// Class with private and protected members
class BankAccount {
  private accountNumber: string;
  private balance: number;
  protected owner: string;
  
  constructor(accountNumber: string, owner: string, initialBalance: number = 0) {
    this.accountNumber = accountNumber;
    this.owner = owner;
    this.balance = initialBalance;
  }
  
  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }
    this.balance += amount;
  }
  
  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }
    if (amount > this.balance) {
      throw new Error("Insufficient funds");
    }
    this.balance -= amount;
  }
  
  getBalance(): number {
    return this.balance;
  }
  
  getAccountDetails(): string {
    return `Account: ${this.accountNumber} (${this.owner}) - Balance: $${this.balance}`;
  }
}

// Class inheritance
class SavingsAccount extends BankAccount {
  private interestRate: number;
  
  constructor(accountNumber: string, owner: string, interestRate: number, initialBalance: number = 0) {
    super(accountNumber, owner, initialBalance);
    this.interestRate = interestRate;
  }
  
  addInterest(): void {
    const interest = this.getBalance() * this.interestRate;
    this.deposit(interest);
  }
  
  override getAccountDetails(): string {
    return `${super.getAccountDetails()} (Interest Rate: ${this.interestRate * 100}%)`;
  }
}

// Class with static members
class MathUtils {
  static readonly PI: number = 3.14159265359;
  
  static square(x: number): number {
    return x * x;
  }
  
  static cube(x: number): number {
    return x * x * x;
  }
  
  static areaOfCircle(radius: number): number {
    return MathUtils.PI * MathUtils.square(radius);
  }
}

// Class implementing multiple interfaces
class EmployeeRecord implements Identifiable, UserProfile {
  id: number;
  name: string;
  email: string;
  username: string;
  bio?: string;
  department: string;
  
  constructor(id: number, name: string, email: string, username: string, department: string) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.username = username;
    this.department = department;
  }
}

// Class with getter and setter
class Temperature {
  private _celsius: number;
  
  constructor(celsius: number) {
    this._celsius = celsius;
  }
  
  get celsius(): number {
    return this._celsius;
  }
  
  set celsius(value: number) {
    if (value < -273.15) {
      throw new Error("Temperature cannot be below absolute zero");
    }
    this._celsius = value;
  }
  
  get fahrenheit(): number {
    return this._celsius * 9/5 + 32;
  }
  
  set fahrenheit(value: number) {
    this.celsius = (value - 32) * 5/9;
  }
}

// Abstract class
abstract class Shape {
  abstract getArea(): number;
  abstract getPerimeter(): number;
  
  toString(): string {
    return `Area: ${this.getArea()}, Perimeter: ${this.getPerimeter()}`;
  }
}

// Concrete implementation of abstract class
class Rectangle extends Shape {
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }
  
  getArea(): number {
    return this.width * this.height;
  }
  
  getPerimeter(): number {
    return 2 * (this.width + this.height);
  }
}

// Using the classes
const user = new User(1, "John Doe");
console.log(user.toString());

const account = new SavingsAccount("123456789", "Jane Smith", 0.05, 1000);
account.deposit(500);
account.addInterest();
console.log(account.getAccountDetails());

const temp = new Temperature(25);
console.log(`${temp.celsius}°C is ${temp.fahrenheit}°F`);
temp.fahrenheit = 68;
console.log(`${temp.celsius}°C is ${temp.fahrenheit}°F`);

const rectangle = new Rectangle(10, 5);
console.log(rectangle.toString());

console.log(`Pi: ${MathUtils.PI}, Area of circle with radius 5: ${MathUtils.areaOfCircle(5)}`);

// Export for reuse
export {
  Identifiable,
  UserProfile,
  Employee,
  Calculator,
  User,
  BankAccount,
  SavingsAccount,
  MathUtils,
  Temperature,
  Shape,
  Rectangle
};