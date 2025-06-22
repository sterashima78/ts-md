# @sterashima78/ts-md-ls-core

Language service plugin providing diagnostics and completion for `.ts.md` files
via Volar. It maps Markdown documents to virtual TypeScript files that the
language server can consume.

## Usage

`collectDiagnostics` と `createTsMdLanguageService` を利用することで、
CLI などから簡単に `.ts.md` ファイルの診断を取得できます。

## Structure
- `src/plugin.ts.md` – Volar plugin definition
- `src/parsers.ts.md` – parse Markdown into chunk dictionaries
- `src/virtual-file.ts.md` – virtual file implementation
- `src/service.ts.md` – ランタイムで利用する言語サービスヘルパー
- `src/plugin.ts.md` 内にテストコードを含む
- `test/fixtures/` – テストで使用する Markdown
