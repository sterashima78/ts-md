# @sterashima78/ts-md-ls-core

`.ts.md` ドキュメントに対して診断や補完を提供する Volar 向け言語サービスプラグインです。Markdown のコードブロックを仮想 TypeScript ファイルへ変換し、Volar の Language Service から利用できるようにします。

## Usage

`createTsMdLanguageService` と `collectDiagnostics` を用いることで、CLI などから簡単に `.ts.md` ファイルを解析できます。ファイルのパスを渡すだけで TypeScript の診断結果を取得できます。

## Structure
- [`src/plugin.ts.md`](src/plugin.ts.md) – Volar プラグイン本体
- [`src/parsers.ts.md`](src/parsers.ts.md) – Markdown を解析してチャンク辞書を生成
- [`src/virtual-file.ts.md`](src/virtual-file.ts.md) – 仮想ファイルの実装
- [`src/service.ts.md`](src/service.ts.md) – CLI などから利用するサービスヘルパー
- [`src/plugin.ts.md`](src/plugin.ts.md) 内にテストコードも含まれています
- `test/fixtures/` – テストで使用する Markdown

プラグインは [`bundleMarkdown`](../core/src/bundle.ts.md) を用いて `main` チャンクと依存チャンクを結合し、Language Service が直接 TypeScript として扱えるコードを生成します。
