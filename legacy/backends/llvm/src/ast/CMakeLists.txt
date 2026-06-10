add_library(ast
    Statement.cpp
    Statements.cpp
    Expression.cpp
    Expressions.cpp
    Type.cpp
    Types.cpp
)

target_include_directories(ast
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(ast
    PRIVATE
        lexer
) 