// Decorator Example

// Method decorator types
type MethodDecorator = (
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => PropertyDescriptor;

// Class decorator types
type ClassDecorator = <T extends new (...args: any[]) => any>(
  constructor: T
) => T | void;

// Method decorators
function log(prefix: string = ''): MethodDecorator {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
      console.log(`${prefix}Calling ${propertyKey} with:`, args);
      const result = originalMethod.apply(this, args);
      console.log(`${prefix}${propertyKey} returned:`, result);
      return result;
    };

    return descriptor;
  };
}

function memoize(): MethodDecorator {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map<string, any>();

    descriptor.value = function(...args: any[]) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        console.log(`Cache hit for ${propertyKey}(${key})`);
        return cache.get(key);
      }

      const result = originalMethod.apply(this, args);
      cache.set(key, result);
      return result;
    };

    return descriptor;
  };
}

// Class decorators
function singleton<T extends new (...args: any[]) => any>(constructor: T) {
  let instance: T['prototype'];

  return class extends constructor {
    constructor(...args: any[]) {
      if (instance) {
        return instance;
      }
      super(...args);
      instance = this;
    }
  };
}

// Example usage
@singleton
class Calculator {
  @log('Calculator: ')
  add(a: number, b: number): number {
    return a + b;
  }

  @log('Calculator: ')
  subtract(a: number, b: number): number {
    return a - b;
  }

  @memoize()
  @log('Calculator: ')
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

// Usage example
function main(): void {
  console.log('Creating calculator instances...');
  const calc1 = new Calculator();
  const calc2 = new Calculator();
  console.log('Same instance:', calc1 === calc2);

  console.log('\nTesting basic operations:');
  calc1.add(5, 3);
  calc1.subtract(10, 4);

  console.log('\nTesting memoized fibonacci:');
  console.log('First call:');
  calc1.fibonacci(5);
  console.log('Second call (should use cache):');
  calc1.fibonacci(5);
  console.log('Different number:');
  calc1.fibonacci(6);
}

main(); 