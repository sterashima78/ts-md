# Bad fixture

```ts foo
export const add = (a: number, b: number) => a + b
```

```ts main
import { add } from '#./bad.ts.md:foo'
add('1', 2)
```
