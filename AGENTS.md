📑 実装指示書 — “TS-MD Platform” モノレポ

> 対象: コーディングエージェント
目的: 文芸的 TypeScript 開発を支えるツールチェーン一式を実装する
パッケージ:
@sterashima78/ts-md-core
@sterashima78/ts-md-vite-plugin
@sterashima78/ts-md-loader
@sterashima78/ts-md-ls-core
@sterashima78/ts-md-vscode
@sterashima78/ts-md-cli
@sterashima78/ts-md-monaco



---

0. ルート構成

.
├─ packages/
│  ├─ core
│  ├─ vite-plugin
│  ├─ loader
│  ├─ ls-core
│  ├─ vscode
│  ├─ cli
│  └─ monaco
├─ docs/            # *.ts.md サンプル
├─ vitest.config.ts
└─ pnpm-workspace.yaml


---

1. 共通仕様

項目内容

ドキュメント拡張子.ts.md
チャンク定義<code>```ts <name></code>
チャンク参照<code>import '#<path>:<name>'</code>
テストチャンク<name> が *.test, *.spec, test, spec
ソースマップ元 Markdown 行を保持
循環検出DFS サイクル検出でエラー



---

2. @sterashima78/ts-md-core

役割代表 API

Markdown → チャンク辞書parseChunks(md, uri)
参照解析resolveImport(id, importer)
VirtualFile 収集collectVirtualFiles(entry)



---

3. @sterashima78/ts-md-vite-plugin

.ts.md を検出しチャンク辞書生成

import '#...:chunk' → 仮想 ID \0tsmd:

テストチャンク は .ts.md.test.ts 扱いにし Vitest が検出

HMR 対応


export function tsMdPlugin(opts?: { alias?: Record<string, string> }): Plugin


---

4. @sterashima78/ts-md-loader

ESM Loader で .ts.md を直接実行可能に

node --loader tsx/esm --loader @sterashima78/ts-md-loader docs/app.ts.md


---

5. @sterashima78/ts-md-ls-core

Volar.js プラグインで VirtualFile を生成

cross-doc 参照を解決


export function createTsMdPlugin(): EmbeddedLanguagePlugin


---

6. @sterashima78/ts-md-vscode

ls-core を組み込んだ Language Server

.ts.md を ts-markdown 言語として登録

コードレンズ「Run Test / Run Chunk」実装



---

7. @sterashima78/ts-md-cli

tsmd check docs/**/*.ts.md         # 型チェック
tsmd tangle docs/app.ts.md -o dist/
tsmd run docs/app.ts.md            # 実行


---

8. @sterashima78/ts-md-monaco

@volar/monaco + ls-core を WebWorker で起動

TsMdEditor React コンポーネントをエクスポート



---

9. テスト & CI

レイヤテスト内容 (Vitest)

coreparseChunks ユニット
vite-plugin.ts.md → JS e2e
loadernode 実行 & snapshot
ls-core診断数アサート
vscodevscode-test 起動確認
clitsmd check exit code

いずれかのファイルを編集した後は、`pnpm i`, `pnpm lint`,
`pnpm typecheck`, `pnpm test` を実行して整合性を確認すること。



---

10. README 抜粋

## Quick Start
pnpm i
pnpm dev            # Vite + HMR
pnpm test           # Vitest
pnpm typecheck      # tsmd check
code .              # VS Code 拡張


---

11. 実装順序

1. core → 2. vite-plugin → 3. loader


2. ls-core → 5. cli → 6. vscode → 7. monaco



---

12. 完了条件

pnpm test, pnpm typecheck, vite build がすべて PASS

VS Code で補完・ジャンプ・テスト実行が動作

Loader 経由で .ts.md を直接実行可

README に GIF／スクリーンショット付き Quick Start



---

💡 以上の要件を満たす実装をお願いします。質問があればどうぞ！
