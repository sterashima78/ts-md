# @sterashima78/ts-md-core

`.ts.md` ドキュメントを処理するためのコアライブラリです。Markdown からチャンクを抽出し、依存関係を解決して実ファイルへ書き出すまでを担います。複数ファイルを一つにまとめるバンドル機能も含まれています。

## Modules
- [parser.ts.md](src/parser.ts.md) – Markdown からチャンクを抽出
- [resolver.ts.md](src/resolver.ts.md) – `file.ts.md:chunk` や `:chunk` のインポートを解析
- [graph.ts.md](src/graph.ts.md) – チャンク間の循環参照を検出
- [tangle.ts.md](src/tangle.ts.md) – 抽出したチャンクをディスクへ書き出し
- [bundle.ts.md](src/bundle.ts.md) – チャンクを結合して 1 ファイルに変換
- [utils.ts.md](src/utils.ts.md) – 補助関数

テストは `test/` 以下にあります。
