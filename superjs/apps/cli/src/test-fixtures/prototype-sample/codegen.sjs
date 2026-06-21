// Prototype-era file — uses old superjs/codegen and superjs/ir imports
import { generate } from 'superjs/codegen';
import { IRNode } from 'superjs/ir';

export function emit(node: IRNode): string {
  return generate(node);
}
