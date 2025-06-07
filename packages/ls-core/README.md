# @sterashima78/ts-md-ls-core

Language service plugin providing diagnostics and completion for `.ts.md` files
via Volar. It maps Markdown documents to virtual TypeScript files that the
language server can consume.

## Structure
- `src/plugin.ts` – Volar plugin definition
- `src/parsers.ts` – parse Markdown into chunk dictionaries
- `src/virtual-file.ts` – virtual file implementation
- `test/` – language service tests
