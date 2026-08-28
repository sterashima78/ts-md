# @sterashima78/ts-md-content-mapper

TypeScript 7.1 nightly の Content Mapper API を使い、`.ts.md` の `main` チャンクを canonical source、その他の named chunk を supplemental source として公開する PoC です。

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

外部 Content Mapper の実行には現在の native compiler で `--runExternalCode` が必要です。

```sh
npx tsc --runExternalCode -p tsconfig.json
```

利用前に mapper package 自体を build してください。

```sh
pnpm --filter @sterashima78/ts-md-content-mapper build
```

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

前者は Content Mapper の canonical output と通常の module resolution で表現できます。残る課題は後者だけです。

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

正確な declaration を作るには named chunk 自身を type check して export type を推論する必要があります。Content Mapper 自身が別の TypeScript compiler を持つことになり、循環依存、generic、re-export、default export なども二重に処理する必要があります。

### namespace や IIFE への変換

すべての named chunk を一つの canonical source に namespace や closure として埋め込み、`:helper` import を書き換える案です。

採用しません。

lexical scope 自体は分離できますが、ES module の import/export、type-only import、re-export、live binding、circular dependency、top-level await などを別の仕組みとして再実装することになります。TS-MD が TypeScript module semantics をそのまま利用するという利点を失います。

### generated physical files

named chunk を hidden `.ts` file として filesystem に生成する案です。

採用しません。

module resolution は容易になりますが、編集時の同期、watch、cleanup、cache、navigation が生成ファイルへ向く問題が発生します。Content Mapper が in-memory mapping を提供する利点も小さくなります。

## 現時点の方針

`:helper` の意味は変更しません。

```ts
import { value } from ':helper';
```

これは「同じ `.ts.md` document に属する `helper` module」という論理 identity として維持します。

内部実装では module identity を文字列の virtual filename ではなく、引き続き次の組として扱うのが適切です。

```ts
{
  documentPath: '/src/example.ts.md',
  moduleName: 'helper'
}
```

Content Mapper は各 module の source mapping と Program への参加を担当し、`:helper` からこの identity への module resolution は別レイヤーとして扱います。

TypeScript 側でも、外部 language tooling の module resolution について callback ではなく static mapping API を用意する方向が議論されています。この API が提供されれば、TS-MD は概念的に次の mapping だけを渡せばよくなります。

```text
(importer: example.ts.md / main, specifier: :helper)
  -> (example.ts.md, helper)
```

この形ならドキュメント外の named chunk を公開する必要はありません。

## JavaScript Module Declarations との関係

TC39 の Module Declarations proposal は、TS-MD が named chunk に求めている semantics とかなり近いものです。

```js
module helper {
  export const value = 42;
}

import { value } from helper;
```

proposal では各 inline module が独立した lexical scope を持ち、同じ外側の module から static import できます。現在 Stage 2 なので TS-MD の構文として直接採用する段階ではありませんが、「一つの source document の中に独立した複数 module が存在する」という model 自体の妥当性を確認する参考になります。

TS-MD は Markdown の code fence がこの inline module boundary に相当し、`main` だけを document 外へ公開する、より制限された model と考えられます。

## 次の検証

次の PoC では nightly compiler を使った end-to-end test で境界を固定します。

1. `main` と named chunk に同名の変数を宣言しても衝突しない
2. named chunk の diagnostic が元の fence 位置へ戻る
3. named chunk 内の通常の npm/file import が解決できる
4. `main` から別 `.ts.md` の `main` を import できる
5. `:helper` だけが現行 Content Mapper API では解決不能であることを確認する

これにより、今後 TypeScript に必要なのが Content Mapper の追加機能なのか、module resolution mapping API なのかを切り分けます。
