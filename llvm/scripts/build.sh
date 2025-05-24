#!/bin/bash
set -e
LLVM_DIR=$(brew --prefix llvm)/lib/cmake/llvm
cmake -B build -DLLVM_DIR="$LLVM_DIR"
cmake --build build 