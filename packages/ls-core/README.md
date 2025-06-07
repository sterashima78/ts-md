# @sterashima78/ts-md-ls-core

Language service plugin providing diagnostics and completion for `.ts.md` files
via Volar. It maps Markdown documents to virtual TypeScript files that the
language server can consume.

## Usage

`collectDiagnostics` と `createTsMdLanguageService` を利用することで、
CLI などから簡単に `.ts.md` ファイルの診断を取得できます。

## Structure
- `src/plugin.ts` – Volar plugin definition
- `src/parsers.ts` – parse Markdown into chunk dictionaries
- `src/virtual-file.ts` – virtual file implementation
- `src/service.ts` – ランタイムで利用する言語サービスヘルパー
- `test/` – language service tests
