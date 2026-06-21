// Prototype-era entry point — uses bare superjs import and relative prototype path
import { compile } from 'superjs';
import { SourceFile } from '../prototype/src/types';

export function run(src: string): string {
  const file: SourceFile = { path: 'main.sjs', source: src };
  return compile(file);
}
