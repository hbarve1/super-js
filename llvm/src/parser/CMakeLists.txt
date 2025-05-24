add_library(superjs_parser
    Parser.cpp
    AST.cpp
)

target_include_directories(superjs_parser
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
        ${CMAKE_SOURCE_DIR}/src
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_SOURCE_DIR}/src/lexer
        ${CMAKE_SOURCE_DIR}/src/parser
        ${CMAKE_SOURCE_DIR}/src/ast
        ${CMAKE_SOURCE_DIR}/include/lexer
        ${CMAKE_SOURCE_DIR}/include/parser
        ${CMAKE_SOURCE_DIR}/include/ast
        ${CMAKE_SOURCE_DIR}/include
        ${CMAKE_SOURCE_DIR}
        ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(superjs_parser
    PRIVATE
        superjs_lexer
) 