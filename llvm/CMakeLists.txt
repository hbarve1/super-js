cmake_minimum_required(VERSION 3.20)
project(superjs VERSION 0.1.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find LLVM
find_package(LLVM REQUIRED CONFIG)
message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

# Add LLVM definitions and include directories
add_definitions(${LLVM_DEFINITIONS})
include_directories(${LLVM_INCLUDE_DIRS})
link_directories(${LLVM_LIBRARY_DIRS})

# Add subdirectories
add_subdirectory(src)
add_subdirectory(lib)
add_subdirectory(tests)

# Main compiler executable
add_executable(superjs
    src/main.cpp
)

# Link against LLVM libraries
target_link_libraries(superjs
    PRIVATE
    ${LLVM_AVAILABLE_LIBS}
    superjs_lexer
    superjs_parser
    superjs_semantic
    superjs_codegen
)

# Installation
install(TARGETS superjs
    RUNTIME DESTINATION bin
) 