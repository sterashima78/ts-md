# Bad fixture

```ts foo
export const add = (a: number, b: number) => a + b
```

```ts main
import { add } from ':foo'
add('1', 2)
```
