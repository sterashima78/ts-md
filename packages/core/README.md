# @sterashima78/ts-md-core

Core utilities for `.ts.md` documents. It parses Markdown, resolves chunk
imports and tangles code blocks into real files.

## Modules
- `parser.ts` – extract named code chunks from Markdown
- `resolver.ts` – resolve `#file:chunk` style imports
- `graph.ts` – detect import cycles between chunks
- `tangle.ts` – write chunks to disk
- `utils.ts` – helper functions

Tests live under `test/`.
