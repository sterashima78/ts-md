import { parse } from './parser.js';
import { resolveImport } from './resolver.js';

export function detectCycle(entry: string): string {
  parse(entry);
  return resolveImport(entry, entry);
}
