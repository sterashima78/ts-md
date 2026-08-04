# @sterashima78/ts-md-unplugin

Vite、Rollup、Rolldown、Webpack、esbuild で `.ts.md` modules を読み込むための unplugin です。

一つの TypeScript コードフェンスを一つの仮想 ES module として扱います。

## Vite

```ts
import tsMd from '@sterashima78/ts-md-unplugin/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tsMd],
})
```

## Rolldown

```ts
import tsMd from '@sterashima78/ts-md-unplugin/rolldown'
import { defineConfig } from 'rolldown'

export default defineConfig({
  plugins: [tsMd],
})
```

通常の TypeScript から document の `main` module を import できます。

```ts
import './app.ts.md'
```

`.ts.md` 内では、同じ document の名前付き module と別 document の `main` module を次のように import します。

```ts
import { value } from ':values'
import type { User } from './user.ts.md'
```

`./user.ts.md:types` のように、別 document の名前付き module を指定する形式はサポートしません。
