find_package(GTest REQUIRED)

add_executable(superjs_tests lexer_test.cpp)
target_include_directories(superjs_tests PRIVATE ${CMAKE_SOURCE_DIR}/src)
target_link_libraries(superjs_tests PRIVATE GTest::GTest GTest::Main superjs_lexer)

add_test(NAME lexer_test COMMAND superjs_tests) 