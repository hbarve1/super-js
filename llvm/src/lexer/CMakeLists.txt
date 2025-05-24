add_library(superjs_lexer
    Lexer.cpp
)

target_include_directories(superjs_lexer
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
        ${CMAKE_SOURCE_DIR}/src
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src/lexer
) 