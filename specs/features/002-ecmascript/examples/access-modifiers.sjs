// SJS4: pub/priv/prot access modifiers

class BankAccount {
  pub owner: string;       // public — accessible everywhere
  priv balance: number;    // private — only within BankAccount
  prot accountId: string;  // protected — accessible in subclasses

  constructor(owner: string, initialBalance: number) {
    this.owner = owner;
    this.balance = initialBalance;
    this.accountId = Math.random().toString(36).slice(2);
  }

  pub deposit(amount: number): void {
    if (amount <= 0) throw new Error("Amount must be positive");
    this.balance += amount;
  }

  pub withdraw(amount: number): boolean {
    if (amount > this.balance) return false;
    this.balance -= amount;
    return true;
  }

  pub getBalance(): number {
    return this.balance;
  }

  priv validate(): boolean {
    return this.balance >= 0;
  }
}

class SavingsAccount extends BankAccount {
  priv interestRate: number;

  constructor(owner: string, initial: number, rate: number) {
    super(owner, initial);
    this.interestRate = rate;
  }

  pub applyInterest(): void {
    // can access prot accountId from parent
    console.log(`Applying interest to account ${this.accountId}`);
    // cannot access priv balance directly — use pub method
    const current = this.getBalance();
    this.deposit(current * this.interestRate);
  }
}

const acct = new BankAccount("Alice", 1000);
acct.deposit(500);              // pub — ok
// acct.balance;                // SJS-E011: priv not accessible outside class
// acct.validate();             // SJS-E011: priv method
console.log(acct.owner);       // pub — ok
console.log(acct.getBalance()); // 1500

const savings = new SavingsAccount("Bob", 2000, 0.05);
savings.applyInterest(); // pub — ok
// savings.accountId;   // SJS-E011: prot not accessible outside class hierarchy
