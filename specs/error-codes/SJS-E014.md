# SJS-E014 — Private or protected member not accessible from this scope

**Severity:** error  
**Category:** access-modifiers  
**Stage:** Stage 1

## Description

SJS enforces access modifiers at compile time:

- `private` members are accessible only within the class that declares them.
- `protected` members are accessible within the declaring class and its subclasses.

Accessing a `private` member from outside the class, or a `protected` member from a non-subclass
context, is a type error.

## Example

```sjs
// ✗ error
class Account {
  private balance: number = 0

  protected internalId: string = "acc-1"
}

const a = new Account()
console.log(a.balance)     // SJS-E014 — private
console.log(a.internalId)  // SJS-E014 — protected, not in a subclass
```

## Fix

Expose state through a public accessor or method:

```sjs
// ✓ correct
class Account {
  private balance: number = 0
  protected internalId: string = "acc-1"

  getBalance(): number {
    return this.balance
  }
}

const a = new Account()
console.log(a.getBalance())   // ✓ public method
```

For `protected` members, access them from a subclass:

```sjs
// ✓ correct — subclass access
class SavingsAccount extends Account {
  describe(): string {
    return `ID: ${this.internalId}`   // ✓ allowed in subclass
  }
}
```

## Related codes

- `SJS-E015` — cannot narrow an access modifier on an overriding method
