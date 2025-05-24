# Placeholder for semantic analysis library
add_library(superjs_semantic
    SemanticAnalyzer.cpp
    SymbolTable.cpp
)

target_include_directories(superjs_semantic
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(superjs_semantic
    PUBLIC
        superjs_parser
        superjs_ast
) 