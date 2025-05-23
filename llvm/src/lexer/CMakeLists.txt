add_library(superjs_lexer
    Lexer.cpp
    Lexer.h
)

target_include_directories(superjs_lexer
    PUBLIC
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}
) 