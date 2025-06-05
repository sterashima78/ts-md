import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils';

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
