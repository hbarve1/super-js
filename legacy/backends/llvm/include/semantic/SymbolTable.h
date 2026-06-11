#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include "../ast/Type.h"

namespace superjs {

class SymbolTable {
public:
    struct Symbol {
        std::shared_ptr<Type> type;
        bool isMutable;
    };

    explicit SymbolTable(std::shared_ptr<SymbolTable> parent = nullptr);
    void define(const std::string& name, std::shared_ptr<Type> type, bool isMutable);
    std::shared_ptr<Symbol> resolve(const std::string& name);
    std::shared_ptr<SymbolTable> getParent() const;

private:
    std::shared_ptr<SymbolTable> parent_;
    std::unordered_map<std::string, Symbol> symbols_;
};

} // namespace superjs 