add_library(superjs_parser
    Parser.cpp
)

target_include_directories(superjs_parser
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(superjs_parser
    PRIVATE
        superjs_lexer
        superjs_ast
) 