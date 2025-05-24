# Placeholder for semantic analysis library
add_library(semantic
    SemanticAnalyzer.cpp
    SymbolTable.cpp
)

target_include_directories(semantic
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(semantic
    PUBLIC
        parser
        ast
) 