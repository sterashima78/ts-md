# Small shared operations

この document には、複数の処理から使われるものの、独立した domain model を必要としない小さな操作を置きます。

関数を一つの大きな utility module にまとめるのではなく、それぞれを名前付き code fence に分けます。利用側は必要な module だけを import でき、説明も関数の用途と制約に集中できます。

## Stable content fingerprints

文字列の内容から安定した fingerprint を作ります。暗号学的な署名ではなく、cache key や変更検出に使う識別値として SHA-1 を利用します。

```ts hash
import crypto from 'node:crypto';

export function hash(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex');
}
```

## Recognizing executable fences

TS-MD が module として扱う Markdown fence は `ts` と `tsx` だけです。この判定を parser から切り離し、受理する language 名を一か所に固定します。

```ts extIsTs
export function extIsTs(lang: string): boolean {
  return lang === 'ts' || lang === 'tsx';
}
```

## Making names file-safe

外部入力に由来する名前を file name の一部へ使う場合、TS-MD の module 名で許可している文字以外を `_` に置き換えます。

parser の validation と異なり、この関数は不正な名前を拒否せず変換します。厳密な module identity を確定する場面では parser を使い、表示用や派生 file name のように best-effort な整形が必要な場面でだけ使います。

```ts escapeChunk
export function escapeChunk(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
```

## Public surface

各 code fence は独立 module ですが、package 利用者には一つの utility surface として再公開します。

```ts main
export { hash } from ':hash';
export { extIsTs } from ':extIsTs';
export { escapeChunk } from ':escapeChunk';
```
