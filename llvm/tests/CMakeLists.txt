find_package(GTest REQUIRED)

add_executable(superjs_tests 
    lexer_test.cpp
    parser_test.cpp
    semantic_test.cpp
)

target_include_directories(superjs_tests 
    PRIVATE 
        ${CMAKE_SOURCE_DIR}/include
        ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(superjs_tests 
    PRIVATE 
        GTest::GTest 
        GTest::Main 
        superjs_lexer
        superjs_parser
        superjs_semantic
)

add_test(NAME superjs_tests COMMAND superjs_tests) 