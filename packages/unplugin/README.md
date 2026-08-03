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

通常の TypeScript から document の `main` module をimportできます。

```ts
import './app.ts.md'
```

`.ts.md` 内では次の記法を使用します。

```ts
import { value } from ':values'
import type { User } from './user.ts.md:types'
```
