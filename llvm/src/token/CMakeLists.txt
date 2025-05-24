add_library(token
    Token.cpp
)

target_include_directories(token
    PUBLIC
        ${CMAKE_SOURCE_DIR}/include
) 