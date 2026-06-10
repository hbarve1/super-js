# Placeholder for code generation library
add_library(superjs_codegen
    IRGenerator.cpp
)

target_include_directories(superjs_codegen PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(superjs_codegen PUBLIC
    ast
    semantic
    ${LLVM_AVAILABLE_LIBS}
) 