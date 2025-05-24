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

# Set include directories for all targets
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)

# Add subdirectories
add_subdirectory(src/lexer)
add_subdirectory(src/parser)
add_subdirectory(src/ast)
add_subdirectory(src/semantic)

# Add executable
add_executable(superjs main.cpp)

# Set include directories for the main executable
target_include_directories(superjs PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/lexer
    ${CMAKE_SOURCE_DIR}/src/parser
    ${CMAKE_SOURCE_DIR}/src/ast
    ${CMAKE_SOURCE_DIR}/src/semantic
)

# Link libraries
target_link_libraries(superjs PRIVATE
    superjs_lexer
    superjs_parser
    superjs_ast
    superjs_semantic
)

# Add tests
enable_testing()
include_directories(${GTEST_INCLUDE_DIRS})

add_executable(superjs_tests
    tests/lexer_test.cpp
    tests/parser_test.cpp
    tests/semantic_test.cpp
)

target_include_directories(superjs_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/lexer
    ${CMAKE_SOURCE_DIR}/src/parser
    ${CMAKE_SOURCE_DIR}/src/ast
    ${CMAKE_SOURCE_DIR}/src/semantic
)

target_link_libraries(superjs_tests PRIVATE
    superjs_lexer
    superjs_parser
    superjs_ast
    superjs_semantic
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