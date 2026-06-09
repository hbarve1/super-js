#!/bin/bash

# Remove build directories and CMake files
rm -rf build/
rm -rf CMakeFiles/
rm -f CMakeCache.txt
rm -f cmake_install.cmake
rm -f Makefile
rm -f CTestTestfile.cmake

# Remove compiled object files, libraries, executables
find . -name "*.o" -type f -delete
find . -name "*.obj" -type f -delete
find . -name "*.so" -type f -delete
find . -name "*.a" -type f -delete
find . -name "*.lib" -type f -delete
find . -name "*.dll" -type f -delete
find . -name "*.exe" -type f -delete
find . -name "*.out" -type f -delete
find . -name "*.dylib" -type f -delete
find . -name "*.app" -type f -delete

# Remove editor/IDE files
find . -name "*.swp" -type f -delete
find . -name "*~" -type f -delete
find . -name "*.sublime*" -type f -delete
rm -rf .vscode/
rm -f .DS_Store
find . -name "*.user" -type f -delete
find . -name "*.workspace" -type f -delete
find . -name "*.code-workspace" -type f -delete

# Remove logs and debug files
find . -name "*.log" -type f -delete
find . -name "*.trace" -type f -delete
find . -name "*.debug" -type f -delete
rm -f lexer_debug.txt

# Remove generated files
find . -name "*.generated.*" -type f -delete

# Remove test binaries and outputs
rm -f tests/*.out
rm -f tests/*.log
rm -f tests/*.tmp

# Remove ignored directories by convention
rm -rf lib/
rm -rf llvm-superjs/

# Remove Node/npm files (if any)
rm -rf node_modules/
rm -f package-lock.json
rm -f yarn.lock

# Remove misc files
find . -name "*.bak" -type f -delete
find . -name "*.tmp" -type f -delete

echo "Cleanup completed successfully!" 