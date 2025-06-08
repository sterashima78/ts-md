# Multi Error

```ts foo
export const num: number = 123
```

```ts main
import { num } from '#foo'
const str: string = num
console.log(str)
```
