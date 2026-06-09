# Super.js LLVM Compiler

## Prerequisites

- **C++17** or later
- **CMake** 3.10+
- **LLVM** (recommended via Homebrew on macOS)
- **GTest** (for running tests)
- **libedit** (for some LLVM builds)
- **Homebrew** (recommended for macOS users)

## Setup (macOS/Homebrew)

```sh
brew install llvm cmake gtest libedit
```

## Environment Setup

Add LLVM binaries to your PATH (if not already):

```sh
export PATH="$(brew --prefix llvm)/bin:$PATH"
```

## Building the Compiler

You can use the provided script:

```sh
./scripts/build.sh
```

Or manually:

```sh
LLVM_DIR=$(brew --prefix llvm)/lib/cmake/llvm
cmake -B build -DLLVM_DIR="$LLVM_DIR"
cmake --build build
```

## Running the Compiler

After building, run:

```sh
./scripts/run.sh <source-file.sjs>
```
Or directly:
```sh
./build/superjs <source-file.sjs>
```

## Running Tests

To run all tests:

```sh
./scripts/test.sh
```
Or directly:
```sh
./build/superjs_tests
```

## Building and Running Example Programs

To process all example `.sjs` files:

```sh
./scripts/build_examples.sh
```

## Cleaning the Build

To clean all build artifacts and temporary files:

```sh
./scripts/cleanup.sh
```

## Directory Structure

- `src/` — Source code (lexer, parser, ast, codegen, etc.)
- `include/` — Public headers
- `tests/` — Test suite
- `examples/` — Example programs
- `scripts/` — Build, run, test, and utility scripts
- `build/` — Build output (created by CMake)

## Troubleshooting

- If you see `'codegen/IRGenerator.h' file not found`, ensure your include paths are correct and CMake is run from the project root.
- If you see LLVM or GTest not found, check your Homebrew installation and environment variables.
- For any CMake or build errors, try running `./scripts/cleanup.sh` and then rebuilding.

## Notes
- The project is under active development. Some features may be incomplete.
- See `PROJECT_OUTLINE.md` for roadmap and progress. 