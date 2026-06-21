// Prototype-era file — uses old superjs/parser import path
import { parse } from 'superjs/parser';
import { check } from 'superjs/checker';

export function parseAndCheck(src: string): void {
  const ast = parse(src);
  check(ast);
}
