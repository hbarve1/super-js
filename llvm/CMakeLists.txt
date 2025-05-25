cmake_minimum_required(VERSION 3.10)
project(superjs VERSION 0.1.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add cmake directory to module path
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

# Workaround for Homebrew LLVM expecting LibEdit::LibEdit
if(NOT TARGET LibEdit::LibEdit)
    add_library(LibEdit::LibEdit INTERFACE IMPORTED)
    set_target_properties(LibEdit::LibEdit PROPERTIES
        INTERFACE_INCLUDE_DIRECTORIES "/opt/homebrew/opt/libedit/include"
        INTERFACE_LINK_LIBRARIES "/opt/homebrew/opt/libedit/lib/libedit.dylib"
    )
endif()

# Find required packages
find_package(LibEdit REQUIRED)
find_package(GTest REQUIRED)
find_package(LLVM REQUIRED CONFIG)

# Add LLVM definitions and include directories
add_definitions(${LLVM_DEFINITIONS})
include_directories(${LLVM_INCLUDE_DIRS})
link_directories(${LLVM_LIBRARY_DIRS})

# Set include directories for all targets
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)

# Add subdirectories
add_subdirectory(src/token)
add_subdirectory(src/lexer)
add_subdirectory(src/parser)
add_subdirectory(src/ast)
add_subdirectory(src/semantic)
add_subdirectory(src/codegen)

# Add executable
add_executable(superjs main.cpp)

# Set include directories for the main executable
target_include_directories(superjs PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)

# Link libraries
target_link_libraries(superjs PRIVATE
    lexer
    parser
    ast
    semantic
    superjs_codegen
    ${LLVM_AVAILABLE_LIBS}
)

# Add tests
enable_testing()
include_directories(${GTEST_INCLUDE_DIRS})

add_executable(superjs_tests
    tests/lexer_test.cpp
    tests/parser_test.cpp
    tests/semantic_test.cpp
    tests/codegen_test.cpp
)

target_include_directories(superjs_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(superjs_tests PRIVATE
    lexer
    parser
    ast
    semantic
    superjs_codegen
    ${GTEST_LIBRARIES}
    ${GTEST_MAIN_LIBRARIES}
    pthread
)

add_test(NAME superjs_tests COMMAND superjs_tests)

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Installation
install(DIRECTORY include/ DESTINATION include)
install(TARGETS superjs
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
) 