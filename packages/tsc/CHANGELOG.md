# @sterashima78/ts-md-tsc

## 0.2.0

### Minor Changes

- [#245](https://github.com/sterashima78/ts-md/pull/245) [`4e4dfb0`](https://github.com/sterashima78/ts-md/commit/4e4dfb0f3004f668865737a504c7e3db22d35448) Thanks [@sterashima78](https://github.com/sterashima78)! - Treat every TypeScript code fence as one independent module across parsing, type checking, editor integration, execution, bundling, and tangle output. Duplicate and unnamed modules are now errors, `#module` imports are removed, and virtual module IDs are shared by all adapters.

### Patch Changes

- Updated dependencies [[`f3cd630`](https://github.com/sterashima78/ts-md/commit/f3cd630563fbf8f2ec44b1550c2acc485879158b), [`f3cd630`](https://github.com/sterashima78/ts-md/commit/f3cd630563fbf8f2ec44b1550c2acc485879158b), [`4e4dfb0`](https://github.com/sterashima78/ts-md/commit/4e4dfb0f3004f668865737a504c7e3db22d35448)]:
  - @sterashima78/ts-md-ls-core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @sterashima78/ts-md-ls-core@0.2.1

## 0.1.0

### Minor Changes

- [#106](https://github.com/sterashima78/ts-md/pull/106) [`4b05be8`](https://github.com/sterashima78/ts-md/commit/4b05be852d0f726f420092a7506059a72870a5b1) Thanks [@sterashima78](https://github.com/sterashima78)! - 新しく ts-md-tsc パッケージを追加し、`.ts.md` を型検査して型定義を生成できるようにしました。

### Patch Changes

- [#118](https://github.com/sterashima78/ts-md/pull/118) [`b30ca72`](https://github.com/sterashima78/ts-md/commit/b30ca72e77d01b048abb437bdd66cf75c436e864) Thanks [@sterashima78](https://github.com/sterashima78)! - CLI の `--outDir` オプションが `tsconfig.json` の設定よりも優先されるように修正しました。

- [#117](https://github.com/sterashima78/ts-md/pull/117) [`1e88b51`](https://github.com/sterashima78/ts-md/commit/1e88b51f7f518c9532d82da2077269167635329e) Thanks [@sterashima78](https://github.com/sterashima78)! - runTsc 実行後に生成された `.d.ts` ファイルを `.ts.md.d.ts` へリネームするようになりました。

- Updated dependencies [[`2cd4486`](https://github.com/sterashima78/ts-md/commit/2cd44869c6d1888ba0df15b91c0ea69b909cb54e), [`60ef1b3`](https://github.com/sterashima78/ts-md/commit/60ef1b33ea87d49ef0c323ccf1e58a5d9d79d7d3), [`bc02220`](https://github.com/sterashima78/ts-md/commit/bc02220aa7d443454b35479080bc253aa6443a26)]:
  - @sterashima78/ts-md-ls-core@0.2.0
