# @sterashima78/ts-md-loader

Node.js の ESM loader として、`.ts.md` document 内の各コードフェンスを独立した TypeScript module としてロードします。

`tsmd run` から利用されます。

```bash
node --import tsx/esm --loader @sterashima78/ts-md-loader app.ts.md
```

- `app.ts.md` は `main` module を読み込みます
- `:module` は同じ document 内の名前付き module を読み込みます
- `./other.ts.md` は別 document の `main` module を読み込みます
- 別 document の名前付き module は読み込めません
