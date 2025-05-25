add_library(parser
    Parser.cpp
    ParserBase.cpp
    ExpressionParser.cpp
    StatementParser.cpp
    TypeParser.cpp
    AST.cpp
    ASTPrinter.cpp
)

target_include_directories(parser
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(parser
    PRIVATE
        lexer
        ast
) 