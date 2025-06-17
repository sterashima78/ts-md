# Types Example

```ts greeter
export interface Greeter {
  greet(message: string): void
}
```

```ts main
export type { Greeter } from '#greeter'
```
