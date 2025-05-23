import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Type, TypeEnvironment } from './types';

export class TypeChecker {
  private env: TypeEnvironment;

  constructor() {
    this.env = new Map();
  }

  public check(path: NodePath): void {
    switch (path.node.type) {
      case 'VariableDeclaration':
        this.checkVariableDeclaration(path as NodePath<t.VariableDeclaration>);
        break;
      case 'FunctionDeclaration':
        this.checkFunctionDeclaration(path as NodePath<t.FunctionDeclaration>);
        break;
      case 'TypeAnnotation':
        this.checkTypeAnnotation(path as NodePath<t.TypeAnnotation>);
        break;
      // Add more cases as needed
    }
  }

  private checkVariableDeclaration(path: NodePath<t.VariableDeclaration>): void {
    path.node.declarations.forEach((declaration) => {
      if (t.isIdentifier(declaration.id)) {
        const typeAnnotation = (declaration.id as t.Identifier & { typeAnnotation?: t.TypeAnnotation }).typeAnnotation;
        
        if (typeAnnotation) {
          const declaredType = this.getTypeFromAnnotation(typeAnnotation);
          if (declaration.init) {
            const inferredType = this.inferType(declaration.init);
            this.assertTypeCompatibility(declaredType, inferredType, path);
          }
          this.env.set(declaration.id.name, declaredType);
        } else if (declaration.init) {
          // Type inference
          const inferredType = this.inferType(declaration.init);
          this.env.set(declaration.id.name, inferredType);
        }
      }
    });
  }

  private checkFunctionDeclaration(path: NodePath<t.FunctionDeclaration>): void {
    if (!path.node.id) return;

    const params = path.node.params.map((param) => {
      if (t.isIdentifier(param)) {
        const typeAnnotation = (param as t.Identifier & { typeAnnotation?: t.TypeAnnotation }).typeAnnotation;
        return typeAnnotation ? this.getTypeFromAnnotation(typeAnnotation) : { kind: 'any' };
      }
      return { kind: 'any' };
    });

    const returnType = path.node.returnType
      ? this.getTypeFromAnnotation(path.node.returnType)
      : { kind: 'any' };

    this.env.set(path.node.id.name, {
      kind: 'function',
      params,
      returnType,
    });
  }

  private checkTypeAnnotation(path: NodePath<t.TypeAnnotation>): void {
    // Implement type annotation checking
  }

  private inferType(node: t.Node): Type {
    switch (node.type) {
      case 'NumericLiteral':
        return { kind: 'number' };
      case 'StringLiteral':
        return { kind: 'string' };
      case 'BooleanLiteral':
        return { kind: 'boolean' };
      case 'NullLiteral':
        return { kind: 'null' };
      case 'Identifier':
        return this.env.get(node.name) || { kind: 'any' };
      case 'ArrayExpression':
        return {
          kind: 'array',
          elementType: node.elements.length > 0
            ? this.inferType(node.elements[0])
            : { kind: 'any' },
        };
      // Add more cases as needed
      default:
        return { kind: 'any' };
    }
  }

  private getTypeFromAnnotation(annotation: t.TypeAnnotation): Type {
    const typeNode = annotation.typeAnnotation;
    switch (typeNode.type) {
      case 'NumberTypeAnnotation':
        return { kind: 'number' };
      case 'StringTypeAnnotation':
        return { kind: 'string' };
      case 'BooleanTypeAnnotation':
        return { kind: 'boolean' };
      case 'NullTypeAnnotation':
        return { kind: 'null' };
      case 'VoidTypeAnnotation':
        return { kind: 'void' };
      // Add more cases as needed
      default:
        return { kind: 'any' };
    }
  }

  private assertTypeCompatibility(expected: Type, actual: Type, path: NodePath): void {
    if (!this.isTypeCompatible(expected, actual)) {
      throw path.buildCodeFrameError(
        `Type '${this.typeToString(actual)}' is not assignable to type '${this.typeToString(expected)}'`
      );
    }
  }

  private isTypeCompatible(expected: Type, actual: Type): boolean {
    if (expected.kind === 'any' || actual.kind === 'any') return true;
    if (expected.kind === actual.kind) return true;
    // Add more type compatibility rules
    return false;
  }

  private typeToString(type: Type): string {
    switch (type.kind) {
      case 'number':
      case 'string':
      case 'boolean':
      case 'null':
      case 'void':
      case 'any':
        return type.kind;
      case 'array':
        return `${this.typeToString(type.elementType)}[]`;
      case 'function':
        const params = type.params.map(this.typeToString).join(', ');
        return `(${params}) => ${this.typeToString(type.returnType)}`;
      default:
        return 'unknown';
    }
  }
} 