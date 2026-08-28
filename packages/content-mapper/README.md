# @sterashima78/ts-md-content-mapper

TypeScript 7.1 の Content Mapper API を使い、`.ts.md` の `main` チャンクを canonical source、その他の named chunk を supplemental source として公開する PoC です。

このパッケージは API と TS-MD のモデルがどこまで直接対応できるかを確認するための実験用で、現在は `private` package としています。

## 現在の変換

入力:

```md
# example

\`\`\`ts helper
const value = 42;
export { value };
\`\`\`

\`\`\`ts main
const value = 100;
export { value };
\`\`\`
```

Content Mapper では `main` を canonical output、`helper` を supplemental output として別々の TypeScript source file にします。

```ts
// canonical
const value = 100;
export { value };
export {};
```

```ts
// supplemental
const value = 42;
export { value };
export {};
```

元のコード本文は UTF-16 の Verbatim span mapping とし、末尾の `export {};` は source mapping を持たない synthetic code です。

`export {};` はすべてのチャンクを必ず TypeScript の external module にするために追加します。これにより、チャンク自身に import/export がない場合でも lexical scope を共有しません。

## TypeScript 側の設定

package.json には現在の Content Mapper manifest 形式を設定します。

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

外部 Content Mapper の実行には現在の native compiler で `--runExternalCode` が必要です。

## TS-MD の module model

この PoC では次を前提とします。

- 1 code fence = 1 TypeScript module
- 各チャンクの lexical scope は完全に独立する
- `.ts.md` の外部へ公開される module は `main` だけ
- 別ドキュメントは `./other.ts.md` でその `main` を参照する
- named chunk は同じドキュメント内からだけ参照できる

したがって、ドキュメント間参照とドキュメント内参照は別問題として扱えます。

```ts
// 別ドキュメントの main
import { publicValue } from './other.ts.md';

// 同じドキュメントの named chunk
import { privateValue } from ':helper';
```

前者は Content Mapper の canonical output と通常の module resolution で表現できます。残る課題は後者です。

## 実コンパイラでの型チェック確認

2026-08-29 に `microsoft/typescript-go` の commit `89d5d5b2849a0db0957065889ca58536fa6d2e4a` を build し、この PoC の mapper を実際に `--runExternalCode` で読み込ませて確認しました。

検証した入力は次の形です。

```md
\`\`\`ts helper
export const value: string = 42;
\`\`\`

\`\`\`ts main
import { value } from ':helper';
const answer: number = value;
export { answer };
\`\`\`
```

compiler は次の二つの diagnostic を返しました。

```text
example.ts.md(8,23): error TS2307: Cannot find module ':helper' or its corresponding type declarations.
example.ts.md.0.ts(4,14): error TS2322: Type 'number' is not assignable to type 'string'.
```

この結果から、現行 Content Mapper について次を確認できました。

1. named chunk は supplemental source として Program に入り、そのチャンク自身の型チェックは実行される。
2. supplemental source は独立した TypeScript module なので、他チャンクと lexical scope を共有しない。
3. `:helper` は module resolver の target にならないため、main と helper の間で export/import を介した型チェックは成立しない。
4. したがって Content Mapper 単独では「ドキュメント内チャンク間の型チェック」までは実現できない。

例えば `helper` が次の型を export していても、

```ts
export const value: string = 'value';
```

`main` の

```ts
import { value } from ':helper';
const answer: number = value;
```

を `string` から `number` への代入として検査するには、まず `:helper` をその supplemental module に module resolution できる必要があります。

また、今回の実行では supplemental 内の diagnostic は `example.ts.md.0.ts` という compiler-assigned virtual filename で報告されました。Verbatim mapping 自体は mapper から返していますが、supplemental diagnostic が元 `.ts.md` の位置として表示されるところまでは確認できていません。これは module resolution とは別の確認事項として残します。

なお npm の `typescript@7.1.0-dev.20260826.1` でも試しましたが、PoC が追従している現在の Content Mapper protocol と npm nightly の protocol に差があり initialize で拒否されたため、上記確認では現在の source implementation を直接 build しています。

## supplemental だけでは `:helper` を解決できない

Content Mapper の supplemental output は Program に独立した TypeScript source file として追加されます。この性質は named chunk の scope を維持する用途には適しています。

一方、supplemental output は protocol 上 unnamed で、compiler が `document.ts.md.0.ts` のような virtual filename を割り当てます。また、module resolver が import target として扱うための API は現在ありません。

そのため、次の対応は直接は作れません。

```text
:helper
  ↓
document.ts.md.0.ts
```

この一点が現在の Content Mapper と TS-MD の module model の差です。

## 検討した解決方法

### compiler-assigned supplemental filename への書き換え

`:helper` を `./document.ts.md.0.ts` のような名前へ変換する案です。

採用しません。

- supplemental filename は mapper protocol の公開 identity ではない
- chunk 順序に依存する
- virtual file は通常の filesystem module resolution target ではない
- compiler implementation detail に依存する

### ambient module bridge

synthetic code で次のような declaration を作る案です。

```ts
declare module ':helper' {
  export const value: number;
}
```

一般解としては採用しません。

正確な declaration を作るには named chunk 自身を type check して export type を推論する必要があります。Content Mapper 自身が別の TypeScript compiler を持つことになり、generic、re-export、default export なども二重に処理する必要があります。

### namespace や IIFE への変換

すべての named chunk を一つの canonical source に namespace や closure として埋め込み、`:helper` import を書き換える案です。

採用しません。

lexical scope 自体は分離できますが、ES module の import/export、type-only import、re-export、live binding、circular dependency、top-level await などを別の仕組みとして再実装することになります。

### generated physical files

named chunk を hidden `.ts` file として filesystem に生成する案です。

採用しません。

module resolution は容易になりますが、編集時の同期、watch、cleanup、cache、navigation が生成ファイルへ向く問題が発生します。

## 現時点の方針

`:helper` の意味は変更しません。

```ts
import { value } from ':helper';
```

これは「同じ `.ts.md` document に属する `helper` module」という論理 identity として維持します。

内部実装では module identity を文字列の virtual filename ではなく、引き続き次の組として扱います。

```ts
{
  documentPath: '/src/example.ts.md',
  moduleName: 'helper'
}
```

必要な resolver は実質的に次の一つです。

```text
(importerDocument: /src/example.ts.md, specifier: :helper)
  -> (/src/example.ts.md, helper)
```

別ドキュメントの named chunk を lookup する必要はありません。

Content Mapper は各 module の source mapping と Program への参加を担当できますが、現在の API だけでは `:helper` から supplemental module への module resolution を登録できません。

したがって、チャンク間の型チェックまで Content Mapper ベースへ移行する条件は、TypeScript が document-local な static module mapping を受け取れることです。それまでは既存の TS-MD language service / compiler adapter が `:helper` resolution を担当する構成が必要です。

## JavaScript Module Declarations との関係

TC39 の Module Declarations proposal は、TS-MD が named chunk に求めている semantics と近いものです。

```js
module helper {
  export const value = 42;
}

import { value } from helper;
```

各 inline module が独立した lexical scope を持つという model は TS-MD の named chunk と対応します。TS-MD では Markdown の code fence が module boundary に相当し、`main` だけを document 外へ公開する、より制限された model と考えられます。

## 次に確認すること

PoC から残る論点は次の二つです。

1. TypeScript の static module mapping API で `:helper` を supplemental module に結び付けられるか。
2. supplemental diagnostic を元 `.ts.md` の code fence 位置へ戻せるか。

この二つが成立すれば、各チャンクの独立 scope を維持しながら、通常の TypeScript module semantics でドキュメント内チャンク間の型チェックを行えます。
