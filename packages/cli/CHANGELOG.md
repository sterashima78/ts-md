# @sterashima78/ts-md-cli

## 0.3.2

### Patch Changes

- Updated dependencies [[`e0c908c`](https://github.com/sterashima78/ts-md/commit/e0c908c120e78cde35c44a925c57ce25ff6dee65)]:
  - @sterashima78/ts-md-core@0.2.1
  - @sterashima78/ts-md-loader@0.2.1
  - @sterashima78/ts-md-ls-core@0.2.1

## 0.3.1

### Patch Changes

- Updated dependencies [[`2cd4486`](https://github.com/sterashima78/ts-md/commit/2cd44869c6d1888ba0df15b91c0ea69b909cb54e), [`60ef1b3`](https://github.com/sterashima78/ts-md/commit/60ef1b33ea87d49ef0c323ccf1e58a5d9d79d7d3), [`5bc7f40`](https://github.com/sterashima78/ts-md/commit/5bc7f40505c3732df04c541f1c51535c01b02941), [`12ae44e`](https://github.com/sterashima78/ts-md/commit/12ae44e085315ee854e6f2e2d7f8a78d4b6151b8), [`bc02220`](https://github.com/sterashima78/ts-md/commit/bc02220aa7d443454b35479080bc253aa6443a26)]:
  - @sterashima78/ts-md-core@0.2.0
  - @sterashima78/ts-md-ls-core@0.2.0
  - @sterashima78/ts-md-loader@0.2.0

## 0.3.0

### Minor Changes

- [#101](https://github.com/sterashima78/ts-md/pull/101) [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58) Thanks [@sterashima78](https://github.com/sterashima78)! - import specifier from "#file:chunk" 形式を廃止し、`./file.ts.md:chunk` を利用するようにしました。

### Patch Changes

- [#101](https://github.com/sterashima78/ts-md/pull/101) [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58) Thanks [@sterashima78](https://github.com/sterashima78)! - check コマンドを tsc にそのまま引数を渡す方式に変更しました

- Updated dependencies [[`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58), [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58), [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58), [`4177fc7`](https://github.com/sterashima78/ts-md/commit/4177fc77fd1b1dfb3218d797ff67aef9749d5e58), [`92a3550`](https://github.com/sterashima78/ts-md/commit/92a355089feeef4769137535d5f4ff9771a5a4ff)]:
  - @sterashima78/ts-md-core@0.1.0
  - @sterashima78/ts-md-loader@0.1.0
  - @sterashima78/ts-md-ls-core@0.1.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`e5c09be`](https://github.com/sterashima78/ts-md/commit/e5c09be043834ee3b874a34a9475637a9979cec8)]:
  - @sterashima78/ts-md-core@0.0.4
  - @sterashima78/ts-md-loader@0.0.4
  - @sterashima78/ts-md-ls-core@0.0.4

## 0.2.0

### Minor Changes

- [#88](https://github.com/sterashima78/ts-md/pull/88) [`6d6f468`](https://github.com/sterashima78/ts-md/commit/6d6f4682f55b88976b16a564c758f1773011453e) Thanks [@sterashima78](https://github.com/sterashima78)! - CLI で check コマンドに TypeScript オプションを渡せるようにしました。sandbox の typecheck では --noEmit を、postbuild では --emitDeclarationOnly を使用します。また、tsconfig に `.ts.md` を含め、ファイルグロブを渡さずにチェックするようにしました。

## 0.1.3

### Patch Changes

- Updated dependencies [[`b0a71c2`](https://github.com/sterashima78/ts-md/commit/b0a71c2e669b90ee7bbb6d42e5a7845fbba8c133)]:
  - @sterashima78/ts-md-core@0.0.3
  - @sterashima78/ts-md-loader@0.0.3
  - @sterashima78/ts-md-ls-core@0.0.3

## 0.1.2

### Patch Changes

- [#60](https://github.com/sterashima78/ts-md/pull/60) [`0936ce6`](https://github.com/sterashima78/ts-md/commit/0936ce6de639715128b9cf816df3529ce0b3c369) Thanks [@sterashima78](https://github.com/sterashima78)! - リリースプロセスのやり直し

- Updated dependencies [[`0936ce6`](https://github.com/sterashima78/ts-md/commit/0936ce6de639715128b9cf816df3529ce0b3c369)]:
  - @sterashima78/ts-md-core@0.0.2
  - @sterashima78/ts-md-loader@0.0.2
  - @sterashima78/ts-md-ls-core@0.0.2

## 0.1.1

### Patch Changes

- [#54](https://github.com/sterashima78/ts-md/pull/54) [`9fbdff4`](https://github.com/sterashima78/ts-md/commit/9fbdff475e9e9db6a607a975563e9a8daf167ea1) Thanks [@sterashima78](https://github.com/sterashima78)! - 初回リリース

- Updated dependencies [[`9fbdff4`](https://github.com/sterashima78/ts-md/commit/9fbdff475e9e9db6a607a975563e9a8daf167ea1)]:
  - @sterashima78/ts-md-core@0.0.1
  - @sterashima78/ts-md-loader@0.0.1
  - @sterashima78/ts-md-ls-core@0.0.1
