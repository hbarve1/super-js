add_library(lexer
    Lexer.cpp
    TokenRecognizer.cpp
    TokenClassifier.cpp
    LexerUtils.cpp
)

target_include_directories(lexer
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(lexer
    PUBLIC
        token
) 