add_library(superjs_ast
    AST.cpp
)

target_include_directories(superjs_ast
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
        ${CMAKE_SOURCE_DIR}/src
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src/ast
        ${CMAKE_SOURCE_DIR}/src/lexer
)

target_link_libraries(superjs_ast
    PRIVATE
        superjs_lexer
) 