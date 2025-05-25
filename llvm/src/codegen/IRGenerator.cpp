#include "codegen/IRGenerator.h"
#include <llvm/IR/Constants.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Type.h>
#include <llvm/IR/Verifier.h>
#include <llvm/Support/raw_ostream.h>

namespace superjs {

IRGenerator::IRGenerator() 
    : context_(std::make_unique<llvm::LLVMContext>()),
      module_(std::make_unique<llvm::Module>("superjs", *context_)),
      builder_(std::make_unique<llvm::IRBuilder<>>(*context_)),
      result_(nullptr) {
}

std::unique_ptr<llvm::Module> IRGenerator::generate(
    const std::vector<std::unique_ptr<Statement>>& statements) {
    // Clear any previous state
    variables_.clear();
    errors_.clear();
    result_ = nullptr;

    // Process each statement
    for (const auto& stmt : statements) {
        stmt->accept(*this);
    }

    // Verify the module
    std::string error;
    llvm::raw_string_ostream errorStream(error);
    if (llvm::verifyModule(*module_, &errorStream)) {
        reportError("Module verification failed: " + error);
        return nullptr;
    }

    return std::move(module_);
}

void IRGenerator::reportError(const std::string& message) {
    errors_.push_back(message);
}

llvm::Type* IRGenerator::getLLVMType(const Type* type) {
    if (!type) return llvm::Type::getVoidTy(*context_);

    // Create a visitor to determine the type
    class TypeToLLVMVisitor : public TypeVisitor {
    public:
        TypeToLLVMVisitor(llvm::LLVMContext& context, IRGenerator& generator)
            : context_(context), generator_(generator) {}

        void visitPrimitiveType(PrimitiveType* type) override {
            if (type->name.kind == TokenKind::Number) {
                result_ = llvm::Type::getDoubleTy(context_);
            } else if (type->name.kind == TokenKind::Boolean) {
                result_ = llvm::Type::getInt1Ty(context_);
            } else if (type->name.kind == TokenKind::String) {
                result_ = llvm::PointerType::get(llvm::Type::getInt8Ty(context_), 0);
            } else if (type->name.kind == TokenKind::Void) {
                result_ = llvm::Type::getVoidTy(context_);
            } else {
                result_ = llvm::Type::getVoidTy(context_);
            }
        }

        void visitArrayType(ArrayType* type) override {
            // For now, treat arrays as pointers to their element type
            llvm::Type* elementType = generator_.getLLVMType(type->elementType.get());
            result_ = llvm::PointerType::get(elementType, 0);
        }

        void visitFunctionType(FunctionType* type) override {
            // For now, treat functions as void* to keep it simple
            result_ = llvm::PointerType::get(llvm::Type::getVoidTy(context_), 0);
        }

        void visitObjectType(ObjectType* type) override {
            // For now, treat objects as void* to keep it simple
            result_ = llvm::PointerType::get(llvm::Type::getVoidTy(context_), 0);
        }

        void visitUnionType(UnionType* type) override {
            // For now, treat unions as void* to keep it simple
            result_ = llvm::PointerType::get(llvm::Type::getVoidTy(context_), 0);
        }

        void visitIntersectionType(IntersectionType* type) override {
            // For now, treat intersections as void* to keep it simple
            result_ = llvm::PointerType::get(llvm::Type::getVoidTy(context_), 0);
        }

        void visitGenericType(GenericType* type) override {
            // For now, treat generics as void* to keep it simple
            result_ = llvm::PointerType::get(llvm::Type::getVoidTy(context_), 0);
        }

        llvm::Type* getResult() const { return result_; }

    private:
        llvm::LLVMContext& context_;
        IRGenerator& generator_;
        llvm::Type* result_ = nullptr;
    };

    TypeToLLVMVisitor visitor(*context_, *this);
    const_cast<Type*>(type)->accept(visitor);
    return visitor.getResult();
}

llvm::Value* IRGenerator::getVariableValue(const std::string& name) {
    auto it = variables_.find(name);
    if (it == variables_.end()) {
        reportError("Undefined variable: " + name);
        return nullptr;
    }
    return it->second;
}

void IRGenerator::setVariableValue(const std::string& name, llvm::Value* value) {
    variables_[name] = value;
}

// Statement visitor implementations
void IRGenerator::visitBlockStatement(BlockStatement* stmt) {
    // TODO: Implement block statement IR generation
}

void IRGenerator::visitExpressionStatement(ExpressionStatement* stmt) {
    stmt->expression->accept(*this);
}

void IRGenerator::visitIfStatement(IfStatement* stmt) {
    // TODO: Implement if statement IR generation
}

void IRGenerator::visitWhileStatement(WhileStatement* stmt) {
    // TODO: Implement while statement IR generation
}

void IRGenerator::visitForStatement(ForStatement* stmt) {
    // TODO: Implement for statement IR generation
}

void IRGenerator::visitFunctionDeclaration(FunctionDeclaration* stmt) {
    // Get the function type
    std::vector<llvm::Type*> paramTypes;
    for (const auto& paramType : stmt->paramTypes) {
        llvm::Type* type = getLLVMType(paramType.get());
        if (!type) {
            reportError("Invalid parameter type for function: " + stmt->name.text);
            return;
        }
        paramTypes.push_back(type);
    }

    llvm::Type* returnType = getLLVMType(stmt->returnType.get());
    if (!returnType) {
        reportError("Invalid return type for function: " + stmt->name.text);
        return;
    }

    // Create the function type
    llvm::FunctionType* functionType = llvm::FunctionType::get(returnType, paramTypes, false);

    // Create the function
    llvm::Function* function = llvm::Function::Create(
        functionType,
        llvm::Function::ExternalLinkage,
        stmt->name.text,
        module_.get()
    );

    // Create a new basic block for the function body
    llvm::BasicBlock* entryBlock = llvm::BasicBlock::Create(*context_, "entry", function);
    builder_->SetInsertPoint(entryBlock);

    // Set up parameter names
    size_t idx = 0;
    for (auto& arg : function->args()) {
        arg.setName(stmt->params[idx].text);
        setVariableValue(stmt->params[idx].text, &arg);
        idx++;
    }

    // Generate IR for the function body
    stmt->body->accept(*this);

    // If the function doesn't have a return statement, add one
    if (!builder_->GetInsertBlock()->getTerminator()) {
        if (returnType->isVoidTy()) {
            builder_->CreateRetVoid();
        } else {
            builder_->CreateRet(llvm::Constant::getNullValue(returnType));
        }
    }

    result_ = function;
}

void IRGenerator::visitClassDeclaration(ClassDeclaration* stmt) {
    // TODO: Implement class declaration IR generation
}

void IRGenerator::visitReturnStatement(ReturnStatement* stmt) {
    if (stmt->value) {
        stmt->value->accept(*this);
        if (result_) {
            builder_->CreateRet(result_);
        } else {
            reportError("Invalid return value");
        }
    } else {
        builder_->CreateRetVoid();
    }
}

void IRGenerator::visitBreakStatement(BreakStatement* stmt) {
    // TODO: Implement break statement IR generation
}

void IRGenerator::visitContinueStatement(ContinueStatement* stmt) {
    // TODO: Implement continue statement IR generation
}

void IRGenerator::visitVariableDeclaration(VariableDeclaration* stmt) {
    // TODO: Implement variable declaration IR generation
}

void IRGenerator::visitImportStatement(ImportStatement* stmt) {
    // TODO: Implement import statement IR generation
}

void IRGenerator::visitExportStatement(ExportStatement* stmt) {
    // TODO: Implement export statement IR generation
}

void IRGenerator::visitTypeDeclaration(TypeDeclaration* stmt) {
    // TODO: Implement type declaration IR generation
}

void IRGenerator::visitInterfaceDeclaration(InterfaceDeclaration* stmt) {
    // TODO: Implement interface declaration IR generation
}

// Expression visitor implementations
void IRGenerator::visitBinaryExpression(BinaryExpression* expr) {
    // Visit left and right operands
    expr->left->accept(*this);
    llvm::Value* left = result_;
    expr->right->accept(*this);
    llvm::Value* right = result_;

    if (!left || !right) {
        result_ = nullptr;
        return;
    }

    // Handle arithmetic operations
    switch (expr->op.kind) {
        case TokenKind::Plus:
            result_ = builder_->CreateFAdd(left, right, "addtmp");
            break;
        case TokenKind::Minus:
            result_ = builder_->CreateFSub(left, right, "subtmp");
            break;
        case TokenKind::Star:
            result_ = builder_->CreateFMul(left, right, "multmp");
            break;
        case TokenKind::Slash:
            result_ = builder_->CreateFDiv(left, right, "divtmp");
            break;
        default:
            reportError("Unsupported binary operator");
            result_ = nullptr;
            break;
    }
}

void IRGenerator::visitUnaryExpression(UnaryExpression* expr) {
    // TODO: Implement unary expression IR generation
}

void IRGenerator::visitLiteralExpression(LiteralExpression* expr) {
    if (expr->value.kind == TokenKind::Number) {
        // Convert string to double for number literals
        double value = std::stod(expr->value.text);
        result_ = llvm::ConstantFP::get(*context_, llvm::APFloat(value));
    } else if (expr->value.kind == TokenKind::Boolean) {
        // Convert string to bool for boolean literals
        bool value = expr->value.text == "true";
        result_ = llvm::ConstantInt::get(*context_, llvm::APInt(1, value));
    } else if (expr->value.kind == TokenKind::String) {
        // Create a global string constant
        result_ = builder_->CreateGlobalString(expr->value.text);
    } else {
        reportError("Unsupported literal type");
        result_ = nullptr;
    }
}

void IRGenerator::visitVariableExpression(VariableExpression* expr) {
    // TODO: Implement variable expression IR generation
}

void IRGenerator::visitAssignmentExpression(AssignmentExpression* expr) {
    // TODO: Implement assignment expression IR generation
}

void IRGenerator::visitCallExpression(CallExpression* expr) {
    // TODO: Implement call expression IR generation
}

void IRGenerator::visitGetExpression(GetExpression* expr) {
    // TODO: Implement get expression IR generation
}

void IRGenerator::visitSetExpression(SetExpression* expr) {
    // TODO: Implement set expression IR generation
}

void IRGenerator::visitThisExpression(ThisExpression* expr) {
    // TODO: Implement this expression IR generation
}

void IRGenerator::visitSuperExpression(SuperExpression* expr) {
    // TODO: Implement super expression IR generation
}

void IRGenerator::visitFunctionExpression(FunctionExpression* expr) {
    // TODO: Implement function expression IR generation
}

void IRGenerator::visitClassExpression(ClassExpression* expr) {
    // TODO: Implement class expression IR generation
}

void IRGenerator::visitJSXExpression(JSXExpression* expr) {
    // TODO: Implement JSX expression IR generation
}

void IRGenerator::visitGroupingExpression(GroupingExpression* expr) {
    expr->expression->accept(*this);
}

void IRGenerator::visitIdentifierExpression(IdentifierExpression* expr) {
    // TODO: Implement identifier expression IR generation
}

void IRGenerator::visitMemberExpression(MemberExpression* expr) {
    // TODO: Implement member expression IR generation
}

} // namespace superjs 