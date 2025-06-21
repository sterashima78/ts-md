# @sterashima78/ts-md-core

## 0.2.1

### Patch Changes

- [#137](https://github.com/sterashima78/ts-md/pull/137) [`e0c908c`](https://github.com/sterashima78/ts-md/commit/e0c908c120e78cde35c44a925c57ce25ff6dee65) Thanks [@sterashima78](https://github.com/sterashima78)! - ts.md のバンドル時に `.test` チャンクを除外するようにしました

## 0.2.0

### Minor Changes

- [#114](https://github.com/sterashima78/ts-md/pull/114) [`2cd4486`](https://github.com/sterashima78/ts-md/commit/2cd44869c6d1888ba0df15b91c0ea69b909cb54e) Thanks [@sterashima78](https://github.com/sterashima78)! - メインコードブロックを起点に ts.md 内のコードを結合するバンドル処理を追加しました。

- [#109](https://github.com/sterashima78/ts-md/pull/109) [`60ef1b3`](https://github.com/sterashima78/ts-md/commit/60ef1b33ea87d49ef0c323ccf1e58a5d9d79d7d3) Thanks [@sterashima78](https://github.com/sterashima78)! - チャンク名を指定した `.ts.md` ファイル間のインポートを廃止し、
  `main` チャンクのみを他ファイルから参照できる仕様に変更しました。
  他のチャンクは同一ファイル内でのみ参照できます。

### Patch Changes

- [#115](https://github.com/sterashima78/ts-md/pull/115) [`5bc7f40`](https://github.com/sterashima78/ts-md/commit/5bc7f40505c3732df04c541f1c51535c01b02941) Thanks [@sterashima78](https://github.com/sterashima78)! - バンドル出力から main 以外のチャンクの export を削除しました。

- [#103](https://github.com/sterashima78/ts-md/pull/103) [`12ae44e`](https://github.com/sterashima78/ts-md/commit/12ae44e085315ee854e6f2e2d7f8a78d4b6151b8) Thanks [@sterashima78](https://github.com/sterashima78)! - core: ts-md-cli のバージョンを 0.3.0 に更新し devDependencies に移動

## 0.1.0

### Minor Changes

- [#101](https://github.com/sterashima78/ts-md/pull/101) [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58) Thanks [@sterashima78](https://github.com/sterashima78)! - import specifier from "#file:chunk" 形式を廃止し、`./file.ts.md:chunk` を利用するようにしました。

- [#101](https://github.com/sterashima78/ts-md/pull/101) [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58) Thanks [@sterashima78](https://github.com/sterashima78)! - 同一ファイル内のチャンクは `:name` のようにファイル名を省略して参照できるようにしました。

### Patch Changes

- [#97](https://github.com/sterashima78/ts-md/pull/97) [`92a3550`](https://github.com/sterashima78/ts-md/commit/92a355089feeef4769137535d5f4ff9771a5a4ff) Thanks [@sterashima78](https://github.com/sterashima78)! - ts-md-cli を 0.2.1 に更新しました

- Updated dependencies [[`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58), [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58)]:
  - @sterashima78/ts-md-cli@0.3.0

## 0.0.4

### Patch Changes

- [#95](https://github.com/sterashima78/ts-md/pull/95) [`e5c09be`](https://github.com/sterashima78/ts-md/commit/e5c09be043834ee3b874a34a9475637a9979cec8) Thanks [@sterashima78](https://github.com/sterashima78)! - ts-md-cli で型定義を生成するよう build 後処理を追加しました。

- Updated dependencies []:
  - @sterashima78/ts-md-cli@0.2.1

## 0.0.3

### Patch Changes

- [#71](https://github.com/sterashima78/ts-md/pull/71) [`b0a71c2`](https://github.com/sterashima78/ts-md/commit/b0a71c2e669b90ee7bbb6d42e5a7845fbba8c133) Thanks [@sterashima78](https://github.com/sterashima78)! - `resolveImport` が ts-md プラグインのプレフィックスやクエリを無視するよう修正しました。

## 0.0.2

### Patch Changes

- [#60](https://github.com/sterashima78/ts-md/pull/60) [`0936ce6`](https://github.com/sterashima78/ts-md/commit/0936ce6de639715128b9cf816df3529ce0b3c369) Thanks [@sterashima78](https://github.com/sterashima78)! - リリースプロセスのやり直し

## 0.0.1

### Patch Changes

- [#54](https://github.com/sterashima78/ts-md/pull/54) [`9fbdff4`](https://github.com/sterashima78/ts-md/commit/9fbdff475e9e9db6a607a975563e9a8daf167ea1) Thanks [@sterashima78](https://github.com/sterashima78)! - 初回リリース
