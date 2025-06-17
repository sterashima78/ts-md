import { detectCycle } from './graph.js';

export function tangle(entry: string): string {
  return detectCycle(entry);
}
