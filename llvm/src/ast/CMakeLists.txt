add_library(ast
    AST.cpp
)

target_include_directories(ast
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(ast
    PRIVATE
        lexer
        parser
) 