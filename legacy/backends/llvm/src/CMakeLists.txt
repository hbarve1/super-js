# Add subdirectories for each component
add_subdirectory(lexer)
add_subdirectory(parser)
add_subdirectory(semantic)
add_subdirectory(codegen)
add_subdirectory(runtime)
add_subdirectory(cli)

# Main compiler executable
add_executable(superjs main.cpp)

# Link against LLVM libraries and our components
target_link_libraries(superjs
    PRIVATE
    ${LLVM_AVAILABLE_LIBS}
    superjs_lexer
    superjs_parser
    superjs_semantic
    superjs_codegen
    superjs_runtime
    superjs_cli
) 