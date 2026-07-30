# @sterashima78/ts-md-cli

`.ts.md` document を操作する CLI です。

## Commands

```bash
tsmd check [globs...]
tsmd run <file> [...nodeArgs]
tsmd tangle [globs...] --outDir dist
```

- `check`: 指定した `.ts.md` document の全 modules を型検査します
- `run`: document の `main` module を Node.js で実行します
- `tangle`: 各コードフェンスを一つの `.ts` / `.tsx` ファイルへ書き出します

コードフェンスは独立 module であり、同名フェンスはエラーです。
