#include "../../include/codegen/IRGenerator.h"
#include <llvm/IR/Constants.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Type.h>
#include <llvm/IR/Verifier.h>
#include <llvm/Support/raw_ostream.h>
#include <memory>
#include <string>
#include <vector>
#include <map>
#include <unordered_map>
#include <iostream>

namespace superjs {

IRGenerator::IRGenerator() 
    : context_(std::make_unique<llvm::LLVMContext>()),
      module_(std::make_unique<llvm::Module>("superjs", *context_)),
      builder_(std::make_unique<llvm::IRBuilder<>>(*context_)),
      result_(nullptr) {
}

std::unique_ptr<llvm::Module> IRGenerator::generate(
    const std::vector<std::unique_ptr<Statement>>& statements) {
    std::cout << "Starting IR generation..." << std::endl;
    
    // Clear any previous state
    variables_.clear();
    errors_.clear();
    result_ = nullptr;

    std::cout << "Creating main function..." << std::endl;
    // Create main function
    llvm::FunctionType* mainType = llvm::FunctionType::get(
        llvm::Type::getInt32Ty(*context_),  // Return type
        false  // Is vararg
    );
    llvm::Function* mainFunction = llvm::Function::Create(
        mainType,
        llvm::Function::ExternalLinkage,
        "main",
        module_.get()
    );

    // Create entry block
    llvm::BasicBlock* entryBlock = llvm::BasicBlock::Create(*context_, "entry", mainFunction);
    builder_->SetInsertPoint(entryBlock);

    std::cout << "Processing " << statements.size() << " statements..." << std::endl;
    // Process each statement
    for (size_t i = 0; i < statements.size(); ++i) {
        std::cout << "Processing statement " << (i + 1) << " of " << statements.size() << "..." << std::endl;
        statements[i]->accept(*this);
        if (!errors_.empty()) {
            std::cout << "Error encountered while processing statement " << (i + 1) << std::endl;
            break;
        }
    }

    std::cout << "Adding return statement to main..." << std::endl;
    // Add return 0 at the end of main
    builder_->CreateRet(llvm::ConstantInt::get(llvm::Type::getInt32Ty(*context_), 0));

    std::cout << "Verifying module..." << std::endl;
    // Verify the module
    std::string error;
    llvm::raw_string_ostream errorStream(error);
    if (llvm::verifyModule(*module_, &errorStream)) {
        reportError("Module verification failed: " + error);
        return nullptr;
    }

    std::cout << "IR generation complete." << std::endl;
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
    // Create a new scope for variables
    std::unordered_map<std::string, llvm::Value*> oldVariables = variables_;
    
    // Process each statement in the block
    for (const auto& statement : stmt->statements) {
        statement->accept(*this);
        if (!errors_.empty()) {
            break;
        }
    }
    
    // Restore the previous scope
    variables_ = oldVariables;
}

void IRGenerator::visitExpressionStatement(ExpressionStatement* stmt) {
    stmt->expression->accept(*this);
}

void IRGenerator::visitIfStatement(IfStatement* stmt) {
    // Generate code for the condition
    stmt->condition->accept(*this);
    llvm::Value* condition = result_;
    if (!condition) {
        reportError("Invalid condition in if statement");
        return;
    }

    // Get the current function and create basic blocks
    llvm::Function* function = builder_->GetInsertBlock()->getParent();
    llvm::BasicBlock* thenBlock = llvm::BasicBlock::Create(*context_, "then", function);
    llvm::BasicBlock* elseBlock = llvm::BasicBlock::Create(*context_, "else");
    llvm::BasicBlock* mergeBlock = llvm::BasicBlock::Create(*context_, "ifcont");

    // Create conditional branch
    builder_->CreateCondBr(condition, thenBlock, elseBlock);

    // Generate code for the then block
    builder_->SetInsertPoint(thenBlock);
    stmt->thenBranch->accept(*this);
    if (!builder_->GetInsertBlock()->getTerminator()) {
        builder_->CreateBr(mergeBlock);
    }

    // Generate code for the else block
    function->insert(function->end(), elseBlock);
    builder_->SetInsertPoint(elseBlock);
    if (stmt->elseBranch) {
        stmt->elseBranch->accept(*this);
    }
    if (!builder_->GetInsertBlock()->getTerminator()) {
        builder_->CreateBr(mergeBlock);
    }

    // Add the merge block
    function->insert(function->end(), mergeBlock);
    builder_->SetInsertPoint(mergeBlock);
}

void IRGenerator::visitWhileStatement(WhileStatement* stmt) {
    // Get the current function
    llvm::Function* function = builder_->GetInsertBlock()->getParent();

    // Create basic blocks
    llvm::BasicBlock* loopHeader = llvm::BasicBlock::Create(*context_, "loop_header", function);
    llvm::BasicBlock* loopBody = llvm::BasicBlock::Create(*context_, "loop_body");
    llvm::BasicBlock* loopExit = llvm::BasicBlock::Create(*context_, "loop_exit");

    // Branch to the loop header
    builder_->CreateBr(loopHeader);

    // Generate code for the loop header (condition)
    builder_->SetInsertPoint(loopHeader);
    stmt->condition->accept(*this);
    llvm::Value* condition = result_;
    if (!condition) {
        reportError("Invalid condition in while statement");
        return;
    }
    builder_->CreateCondBr(condition, loopBody, loopExit);

    // Generate code for the loop body
    function->insert(function->end(), loopBody);
    builder_->SetInsertPoint(loopBody);
    stmt->body->accept(*this);
    if (!builder_->GetInsertBlock()->getTerminator()) {
        builder_->CreateBr(loopHeader);
    }

    // Add the exit block
    function->insert(function->end(), loopExit);
    builder_->SetInsertPoint(loopExit);
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
    std::cout << "Processing variable declaration: " << stmt->name.text << std::endl;
    
    // Get the variable type
    llvm::Type* varType = getLLVMType(stmt->typeAnnotation.get());
    if (!varType) {
        reportError("Invalid type for variable: " + stmt->name.text);
        return;
    }
    std::cout << "Variable type determined" << std::endl;

    // Create alloca instruction for the variable
    llvm::Value* alloca = builder_->CreateAlloca(varType, nullptr, stmt->name.text);
    std::cout << "Alloca instruction created" << std::endl;
    
    // If there's an initializer, generate code for it
    if (stmt->initializer) {
        std::cout << "Processing initializer" << std::endl;
        stmt->initializer->accept(*this);
        if (result_) {
            std::cout << "Initializer result type: " << (result_->getType()->isIntegerTy(1) ? "boolean" : 
                                                       result_->getType()->isDoubleTy() ? "number" : 
                                                       "other") << std::endl;
            std::cout << "Variable type: " << (varType->isIntegerTy(1) ? "boolean" : 
                                            varType->isDoubleTy() ? "number" : 
                                            "other") << std::endl;
            
            // If the types don't match, try to convert
            if (result_->getType() != varType) {
                if (varType->isIntegerTy(1) && result_->getType()->isIntegerTy(1)) {
                    // Boolean to boolean conversion
                    result_ = builder_->CreateZExt(result_, varType);
                } else if (varType->isDoubleTy() && result_->getType()->isIntegerTy(1)) {
                    // Boolean to double conversion
                    result_ = builder_->CreateUIToFP(result_, varType);
                } else {
                    reportError("Type mismatch in variable initialization: " + stmt->name.text);
                    return;
                }
            }
            // Store the initializer value into the variable
            builder_->CreateStore(result_, alloca);
            std::cout << "Initializer stored" << std::endl;
        } else {
            reportError("Invalid initializer for variable: " + stmt->name.text);
            return;
        }
    } else {
        // Initialize with null/zero value if no initializer
        builder_->CreateStore(llvm::Constant::getNullValue(varType), alloca);
        std::cout << "Null initializer stored" << std::endl;
    }

    // Store the variable in the current scope
    setVariableValue(stmt->name.text, alloca);
    result_ = alloca;
    std::cout << "Variable declaration complete" << std::endl;
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
    } else if (expr->value.kind == TokenKind::True || expr->value.kind == TokenKind::False) {
        // Convert string to bool for boolean literals
        bool value = expr->value.kind == TokenKind::True;
        result_ = llvm::ConstantInt::get(llvm::Type::getInt1Ty(*context_), value);
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
    std::cout << "Processing call expression" << std::endl;
    // Only support direct function calls by name for now
    VariableExpression* varExpr = dynamic_cast<VariableExpression*>(expr->callee.get());
    if (!varExpr) {
        reportError("Only direct function calls by name are supported");
        result_ = nullptr;
        return;
    }
    std::string funcName = varExpr->name.text;
    llvm::Function* function = module_->getFunction(funcName);
    if (!function) {
        reportError("Function not found: " + funcName);
        result_ = nullptr;
        return;
    }
    std::vector<llvm::Value*> args;
    for (const auto& arg : expr->arguments) {
        std::cout << "Processing argument" << std::endl;
        arg->accept(*this);
        if (!result_) {
            reportError("Invalid argument in function call");
            return;
        }
        args.push_back(result_);
    }
    std::cout << "Arguments processed" << std::endl;
    result_ = builder_->CreateCall(function, args);
    std::cout << "Call instruction created" << std::endl;
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