# @sterashima78/ts-md-cli

`.ts.md` document を操作する CLI です。

## Commands

```bash
tsmd check [...tscArgs]
tsmd run <file> [...nodeArgs]
tsmd tangle [globs...] --outDir dist
```

- `check`: `ts-md-tsc --noEmit` と同じ実装で `tsconfig.json` のプロジェクトを型検査します
- `run`: document の `main` module を Node.js で実行します
- `tangle`: 各コードフェンスを一つの `.ts` / `.tsx` ファイルへ書き出します

`check` には `-p tsconfig.json` などの TypeScript コマンドラインオプションを渡せます。ファイルglobを直接指定する形式はサポートしません。

コードフェンスは独立 module であり、同名フェンスはエラーです。
