# Parser

```ts main
import type { Code, Html, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils.ts.md';

export interface ChunkDict {
  [name: string]: string;
}

export function parseChunks(markdown: string, uri: string): ChunkDict {
  const tree = unified().use(remarkParse).parse(markdown);
  const dict: ChunkDict = {};
  let pendingFile: string | null = null;

  visit(tree, (node) => {
    if (node.type === 'html') {
      const m = /<!--\s*file:\s*([^>]+)-->/.exec(node.value);
      if (m) {
        pendingFile = m[1].trim();
      }
    }

    if (node.type === 'code' && extIsTs(node.lang ?? '')) {
      const name = (node.meta ?? '').trim();
      if (!name) return;
      const key = pendingFile ?? name;
      if (dict[key]) {
        dict[key] += `\n${node.value}`;
      } else {
        dict[key] = node.value;
      }
      pendingFile = null;
    }
  });

  return dict;
}

export interface ChunkInfo {
  code: string;
  start: number;
  end: number;
}

export function parseChunkInfos(
  markdown: string,
  uri: string,
): Record<string, ChunkInfo> {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  const dict: Record<string, ChunkInfo> = {};
  let pendingFile: string | null = null;
  visit(tree, (node) => {
    if (node.type === 'html') {
      const value = (node as Html).value ?? '';
      const m = /<!--\s*file:\s*([^>]+)-->/.exec(value);
      if (m) {
        pendingFile = m[1].trim();
      }
    }

    if (node.type === 'code' && extIsTs((node as Code).lang ?? '')) {
      const meta = (node as Code).meta ?? '';
      const name = meta.trim();
      if (!name) return;
      const key = pendingFile ?? name;
      const pos = node.position;
      const start = pos?.start.offset ?? 0;
      const end = pos?.end.offset ?? start + (node as Code).value.length;
      const full = markdown.slice(start, end);
      const idx = full.indexOf((node as Code).value);
      const codeStart = idx === -1 ? start : start + idx;
      const code = (node as Code).value;
      if (dict[key]) {
        const prev = dict[key];
        prev.code += `\n${code}`;
        prev.end = codeStart + code.length;
      } else {
        dict[key] = { code, start: codeStart, end: codeStart + code.length };
      }
      pendingFile = null;
    }
  });
  return dict;
}

```
