# TS-MD Platform

Markdown の説明文と、実行・型検査可能な TypeScript modules を同じ `.ts.md` document に記述するためのツール群です。

このプロジェクトは AI コーディングの実践を試すホビープロジェクトで、API とファイル形式は実験的です。

## Concept

一つの TypeScript コードフェンスを、一つの独立した ES module として扱います。

````markdown
# Example

値を提供する module です。

```ts values
export const value = 42
```

`main` は document の既定 entry module です。

```ts main
import { value } from ':values'
console.log(value)
```
````

規則は次のとおりです。

- `ts` または `tsx` コードフェンスには module 名が必要です
- module 名は document 内で一意でなければなりません
- 同名コードフェンスは連結されません
- `.ts.md` document を直接実行・importすると `main` module が使われます
- module 名には英数字、`.`, `_`, `-` を使用できます

## Imports

同じ document 内の module:

```ts
import { value } from ':values'
```

別 document の `main` module:

```ts
import { start } from './app.ts.md'
```

別 document の名前付き module:

```ts
import type { User } from './user.ts.md:types'
```

`#module` 形式はサポートしません。

## Quick Start

```bash
pnpm i
pnpm dev
pnpm test
pnpm typecheck
code .
```

CLI:

```bash
tsmd check -p tsconfig.json
tsmd run src/app.ts.md
tsmd tangle 'src/**/*.ts.md' --outDir dist
```

`check` は `ts-md-tsc --noEmit` に委譲し、`tsconfig.json` と TypeScript のコマンドラインオプションに従ってプロジェクト全体を型検査します。

`tangle` は各 module を個別ファイルへ出力します。

```text
src/app.ts.md:main   -> dist/app/main.ts
src/app.ts.md:view   -> dist/app/view.tsx
```

## Packages

- `@sterashima78/ts-md-core`: document parser、module resolver、virtual module ID、tangle
- `@sterashima78/ts-md-loader`: Node.js ESM loader
- `@sterashima78/ts-md-unplugin`: Vite、Rollup、Webpack、esbuild integration
- `@sterashima78/ts-md-ls-core`: Volar/TypeScript language plugin
- `@sterashima78/ts-md-tsc`: `tsc` compatible type checking and declaration emit
- `@sterashima78/ts-md-cli`: `check`、`run`、`tangle`
- `@sterashima78/ts-md-vscode`: VS Code extension
- `@sterashima78/ts-md-monaco`: Monaco Editor integration
