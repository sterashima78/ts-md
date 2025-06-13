# Sandbox

```ts main
import { msg } from '#foo'
console.log(msg)
```

```ts foo
export const msg = 'hello sandbox'
```

```ts greet
export function greet(name) {
  return `Hello, ${name}!`
}
```
