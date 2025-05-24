#!/bin/bash

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLES_DIR="$PROJECT_ROOT/../examples"
BUILD_DIR="$PROJECT_ROOT/build"
COMPILER="$BUILD_DIR/superjs"

# Ensure the compiler is built
if [ ! -f "$COMPILER" ]; then
    echo "Building compiler..."
    cd "$PROJECT_ROOT"
    mkdir -p build
    cd build
    cmake ..
    make
    if [ $? -ne 0 ]; then
        echo "Failed to build compiler"
        exit 1
    fi
fi

# Create examples build directory
EXAMPLES_BUILD_DIR="$EXAMPLES_DIR/build"
mkdir -p "$EXAMPLES_BUILD_DIR"

# Function to process a single file
process_file() {
    local input_file="$1"
    local output_file="$EXAMPLES_BUILD_DIR/$(basename "$input_file" .sjs).tokens"
    
    echo "Processing $input_file..."
    echo "=== Tokens for $(basename "$input_file") ===" > "$output_file"
    "$COMPILER" "$input_file" >> "$output_file" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "Successfully processed $input_file"
        echo "Tokens saved to $output_file"
    else
        echo "Failed to process $input_file"
        return 1
    fi
}

# Process all .sjs files in the examples directory and its subdirectories
echo "Starting to process example files..."
echo "Note: Currently only tokenization is supported"
echo "Output will be saved to $EXAMPLES_BUILD_DIR"
echo

find "$EXAMPLES_DIR" -name "*.sjs" | while read -r file; do
    process_file "$file"
    echo
done

echo "Process completed!"
echo "Check the build directory at $EXAMPLES_BUILD_DIR for token output files" 
