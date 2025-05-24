#include "semantic/SymbolTable.h"
#include <memory>
#include <string>
#include <unordered_map>

namespace superjs {

SymbolTable::SymbolTable(std::shared_ptr<SymbolTable> parent)
    : parent_(parent) {}

void SymbolTable::define(const std::string& name, std::shared_ptr<Type> type, bool isMutable) {
    symbols_[name] = Symbol{type, isMutable};
}

std::shared_ptr<SymbolTable::Symbol> SymbolTable::resolve(const std::string& name) {
    auto it = symbols_.find(name);
    if (it != symbols_.end()) {
        return std::make_shared<Symbol>(it->second);
    }
    if (parent_) {
        return parent_->resolve(name);
    }
    return nullptr;
}

std::shared_ptr<SymbolTable> SymbolTable::getParent() const {
    return parent_;
}

} // namespace superjs 