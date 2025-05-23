add_library(superjs_parser
    AST.h
    Parser.h
    Parser.cpp
)

target_include_directories(superjs_parser
    PUBLIC
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(superjs_parser
    PUBLIC
    superjs_lexer
) 