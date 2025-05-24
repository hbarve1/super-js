# Placeholder for semantic analysis library
add_library(superjs_semantic
    SemanticAnalyzer.cpp
)

target_include_directories(superjs_semantic
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/../../include
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
)

target_link_libraries(superjs_semantic
    PUBLIC
        superjs_parser
) 