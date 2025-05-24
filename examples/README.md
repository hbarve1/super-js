# super.js Examples

This directory contains various examples demonstrating the features and capabilities of super.js. Each example is designed to showcase different aspects of the language and common programming patterns.

## Basic Examples

### 1. Types (`basics/types.sjs`)
Demonstrates the type system features including:
- Type aliases
- Interfaces
- Union types
- Optional types
- Function types
- Array types

### 2. Classes (`basics/classes.sjs`)
Shows object-oriented programming features:
- Class inheritance
- Abstract classes
- Interfaces
- Private fields (#)
- Protected members
- Static methods

## Advanced Examples

### 3. Generics (`advanced/generics.sjs`)
Illustrates generic programming concepts:
- Generic interfaces
- Generic classes
- Generic functions
- Type constraints
- Generic type inference

### 4. Async Iterator (`advanced/async-iterator.sjs`)
Demonstrates asynchronous iteration:
- Async iterators
- Async generators
- Pagination handling
- Data streaming

### 5. Decorators (`advanced/decorators.sjs`)
Shows the decorator pattern implementation:
- Method decorators
- Class decorators
- Property decorators
- Decorator factories
- Real-world decorator use cases

## Design Patterns

### 6. Dependency Injection (`patterns/dependency-injection.sjs`)
Implements a dependency injection container:
- Service interfaces
- Service implementations
- Dependency container
- Service registration and resolution
- Application composition

### 7. Events (`patterns/events.sjs`)
Shows event handling and pub/sub pattern:
- Event emitter implementation
- Event subscription
- Event unsubscription
- Type-safe events
- Real-time updates

### 8. State Management (`patterns/state.sjs`)
Demonstrates state management pattern:
- Action types
- State reducer
- Store implementation
- State subscription
- Immutable updates

### 9. Observable (`patterns/observable.sjs`)
Implements the observer pattern:
- Observable class
- Observer interface
- Subscription management
- Real-time data updates
- Multiple observers

### 10. Middleware (`patterns/middleware.sjs`)
Shows middleware pattern implementation:
- Middleware chain
- Request/Response handling
- Async middleware
- Error handling
- Common middleware examples

## Running the Examples

To run any example, use the super.js compiler:

```bash
npx super-js compile examples/path/to/example.sjs
node examples/path/to/example.js
```

Each example is self-contained and includes a `main()` function that demonstrates its usage.

## Learning Path

For best learning experience, we recommend following the examples in this order:

1. Start with basic examples to understand the type system and classes
2. Move to advanced examples to learn about generics and async programming
3. Explore the design patterns to see how super.js can be used in real-world scenarios

## Contributing

Feel free to add more examples or improve existing ones. Make sure to:

1. Follow the established directory structure
2. Include detailed comments explaining the code
3. Add usage examples in the main function
4. Update this README with any new examples 