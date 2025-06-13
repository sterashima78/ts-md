# @sterashima78/ts-md-sandbox

unplugin の検証用サンドボックス。`.ts.md` ファイルを tsup または Vite でビルドして実行します。

```
pnpm -F @sterashima78/ts-md-sandbox build
pnpm -F @sterashima78/ts-md-sandbox build:tsup
pnpm -F @sterashima78/ts-md-sandbox build:vite
pnpm -F @sterashima78/ts-md-sandbox start
pnpm -F @sterashima78/ts-md-sandbox typecheck
pnpm -F @sterashima78/ts-md-sandbox test
```

## ts ファイルから ts.md をインポートする例

`src/import-example.ts` では `.ts` ファイルから `.ts.md` ファイルのチャンクをインポートしています。

```ts
import '#./app.ts.md:foo'
```

## ts.md ファイルから type インポートする例

`src/type-import-example.ts` では `.ts.md` ファイルから型のみを
インポートしています。

```ts
import type { Greeter } from '#./types.ts.md:greeter'
```
