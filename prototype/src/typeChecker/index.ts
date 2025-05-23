import { NodePath } from '@babel/traverse';

export class TypeChecker {
  check(path: NodePath): void {
    console.log('Type checking path:', path.type);
    // TODO: Implement type checking
  }
} 