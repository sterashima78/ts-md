# @sterashima78/ts-md-core

`.ts.md` document の共通意味モデルを提供するコアライブラリです。

## Model

- 一つの `ts` / `tsx` コードフェンスは一つの TypeScript module
- module 名は必須かつ document 内で一意
- 同名フェンスの暗黙的な連結は行わない
- `:module` は同じ document の名前付き module を参照
- module 指定のない `.ts.md` import は別 document の `main` を参照
- 別 document の名前付き module は参照できない

## Main APIs

- `parseDocument(markdown, uri)`: `TsMdDocument` を生成
- `parseChunks(markdown, uri)`: module code の辞書を生成
- `resolveImport(specifier, importer)`: `.ts.md` module specifier を解決
- `createVirtualModuleFileName` / `parseVirtualModuleFileName`: tool 間で共通の仮想 module ID
- `detectCycle`: TypeScript AST に基づく module graph の循環検出
- `tangle`: 各 module を個別の `.ts` / `.tsx` ファイルへ出力

## Source

- `src/parser.ts.md`: document parser
- `src/module-id.ts.md`: virtual module ID
- `src/resolver.ts.md`: module specifier resolver
- `src/graph.ts.md`: dependency graph
- `src/tangle.ts.md`: file output
