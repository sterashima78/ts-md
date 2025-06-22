# @sterashima78/ts-md-loader

Node.js の ES module ローダーです。`.ts.md` ドキュメントやチャンクをそのまま
`node --loader` で実行できるようにします。CLI の `run` コマンドから利用されます。

## Structure
- [src/index.ts.md](src/index.ts.md) – `resolve` と `load` の実装
- `test/` – integration tests running Node with the loader
