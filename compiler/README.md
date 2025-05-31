# Super-JS Compiler

A type-safe JavaScript superset compiler that adds static typing and additional safety features to JavaScript.

## Features

- Static type checking
- Pattern matching
- Immutability controls
- Contract programming
- Enhanced error handling
- Documentation features

## Project Structure

```
compiler/
├── src/
│   ├── lexer/           # Lexical analysis
│   ├── parser/          # Syntax analysis
│   ├── ast/            # Abstract Syntax Tree
│   ├── type-checker/   # Type checking
│   ├── codegen/        # Code generation
│   └── utils/          # Utility functions
├── tests/              # Test files
├── package.json
└── README.md
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
```

3. Build the project:
```bash
npm run build
```

## Development

- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run build` - Build the project

## License

MIT 