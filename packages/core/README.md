# @sterashima78/ts-md-core

Core utilities for `.ts.md` documents. It parses Markdown, resolves chunk
imports and tangles code blocks into real files.

## Modules
- `parser.ts.md` – extract named code chunks from Markdown
- `resolver.ts.md` – resolve `file.ts.md:chunk` and `:chunk` imports
- `graph.ts.md` – detect import cycles between chunks
- `tangle.ts.md` – write chunks to disk
- `utils.ts.md` – helper functions

Tests live under `test/`.
