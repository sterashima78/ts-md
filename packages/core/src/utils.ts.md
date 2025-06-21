# Utils

チャンク解析やロード処理で使われる小さなユーティリティ関数をまとめています。

## hash: SHA-1 ハッシュを生成する

文字列から SHA-1 ハッシュを計算します。

```ts hash
import crypto from 'node:crypto';

export function hash(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex');
}
```

## extIsTs: TypeScript 判定

コードブロックの言語名が `ts` または `tsx` の場合に true を返します。

```ts extIsTs
export function extIsTs(lang: string): boolean {
  return lang === 'ts' || lang === 'tsx';
}
```

## escapeChunk: チャンク名の整形

チャンク名に使用できない文字を `_` に置き換えます。

```ts escapeChunk
export function escapeChunk(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
```

## 公開インタフェース

上記の関数を公開します。

```ts main
export { hash } from ':hash';
export { extIsTs } from ':extIsTs';
export { escapeChunk } from ':escapeChunk';
```
