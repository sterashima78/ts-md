import { extIsTs } from './utils.js';

export interface ChunkDict {
  [name: string]: string;
}

export function parse(input: string): ChunkDict {
  return extIsTs(input) ? { main: input } : {};
}
