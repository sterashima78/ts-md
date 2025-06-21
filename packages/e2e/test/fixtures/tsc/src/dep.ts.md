# Dep

```ts bar
import { util } from './util.ts.md';
import { helper } from './helper';
export function bar(): string {
  return util() + helper();
}
```

```ts main
export { bar } from '#bar';
```
