#include <iostream>
#include <string>
#include <vector>
#include <filesystem>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <input-file>" << std::endl;
        return 1;
    }

    std::string inputFile = argv[1];
    if (!std::filesystem::exists(inputFile)) {
        std::cerr << "Error: File '" << inputFile << "' does not exist." << std::endl;
        return 1;
    }

    // TODO: Implement compiler pipeline
    std::cout << "Compiling: " << inputFile << std::endl;

    return 0;
} 