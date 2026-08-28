# @sterashima78/ts-md-content-mapper

TypeScript 7.1 nightly の Content Mapper API を使い、`.ts.md` の `main` チャンクを TypeScript の canonical source として公開する PoC です。

このパッケージは API と TS-MD のモデルがどこまで直接対応できるかを確認するための実験用で、現在は `private` package としています。

## 現在の変換

入力:

```md
# example

\`\`\`ts helper
export const value = 42;
\`\`\`

\`\`\`ts main
export const answer = 42;
\`\`\`
```

Content Mapper から TypeScript へ返す canonical output:

```ts
export const answer = 42;
```

`main` のコード本文は元 Markdown と同一なので、Content Mapper には UTF-16 の Verbatim span mapping を返します。これにより diagnostics や language service の位置を元の `.ts.md` に戻せます。

`helper` など `main` 以外のチャンクは、現段階では `supplemental` output にしていません。

## TypeScript 側の設定

この PoC は現在の TypeScript 7.1 nightly の manifest 形式を使います。package.json には次の設定が含まれています。

```json
{
  "typescript": {
    "contentMapper": {
      "exec": ["node", "dist/server.js"]
    }
  }
}
```

利用側の `tsconfig.json` では Content Mapper を登録します。

```json
{
  "contentMappers": [
    {
      "package": "@sterashima78/ts-md-content-mapper",
      "extensions": [".ts.md"]
    }
  ],
  "include": ["src"]
}
```

TypeScript の CLI から外部 mapper を実行するときは `--loadExternalPlugins` が必要です。

```sh
npx -p typescript@next tsc --loadExternalPlugins -p tsconfig.json
```

利用前に mapper package 自体を build してください。

```sh
pnpm --filter @sterashima78/ts-md-content-mapper build
```

## ドキュメント内チャンク参照に関する制約

Content Mapper の `supplemental` output は Program には追加されますが、module resolution の target にはなりません。そのため、現在の TS-MD の次の構文を `helper` の supplemental output に直接結び付けることはできません。

```ts
import { value } from ':helper';
```

一方、別ファイルの `.ts.md` import は、そのファイルの canonical output、つまり `main` を module resolution で読み込めるため、Content Mapper のモデルとよく一致します。

```ts
import { value } from './other.ts.md';
```

この PoC ではドキュメント内参照の意味をまだ変更しません。次の検討では少なくとも以下を比較できます。

- `:helper` import を mapper が canonical output 内の synthetic code に展開する
- named chunk を独立 module ではなく canonical module の内部 fragment として扱う
- Markdown 側で chunk の依存関係を宣言し、TypeScript 上の import 構文を不要にする
- Content Mapper と専用 language service を併用し、`:helper` だけを TS-MD 側で解決する

PoC の目的は、この選択を Content Mapper の実際の制約を前提に評価できるようにすることです。
