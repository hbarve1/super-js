add_library(superjs_parser
    Parser.cpp
)

target_include_directories(superjs_parser
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
        ${CMAKE_SOURCE_DIR}/src
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src/lexer
        ${CMAKE_SOURCE_DIR}/src/parser
        ${CMAKE_SOURCE_DIR}/src/ast
)

target_link_libraries(superjs_parser
    PRIVATE
        superjs_lexer
) 