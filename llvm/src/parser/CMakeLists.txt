add_library(parser
    ParserBase.cpp
    Parser.cpp
    ExpressionParser.cpp
    StatementParser.cpp
    TypeParser.cpp
)

target_include_directories(parser
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(parser
    PUBLIC
        lexer
        ast
) 