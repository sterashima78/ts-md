# @sterashima78/ts-md-unplugin

Bundler plugin to handle `.ts.md` files. It exposes wrappers for Vite, Rollup, Webpack and Esbuild.

When a document is loaded, its chunks become virtual modules that can be imported via `#path:chunk` syntax.

## Structure
- `src/index.ts.md` – common plugin logic
- `src/vite.ts`, `src/rollup.ts`, `src/webpack.ts`, `src/esbuild.ts` – wrappers
- `test/` – tests using the Rollup plugin

## Examples

### Vite
```ts
import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tsMd],
});
```

### Rollup
```ts
import tsMd from '@sterashima78/ts-md-unplugin/rollup';

export default {
  input: '../../packages/sandbox/src/app.ts.md',
  plugins: [tsMd],
};
```

### Esbuild
```ts
import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { build } from 'esbuild';

build({
  entryPoints: ['../../packages/sandbox/src/app.ts.md'],
  bundle: true,
  plugins: [tsMd],
  outfile: 'out.js',
});
```

### Webpack
```js
const tsMd = require('@sterashima78/ts-md-unplugin/webpack');

module.exports = {
  entry: './main.ts',
  plugins: [tsMd],
};
```

```ts
// main.ts
import '#../../packages/sandbox/src/app.ts.md';
```
