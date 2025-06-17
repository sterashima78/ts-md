# Cross Dep

```ts foo
export const val = 'cross value'
```

```ts main
export { val } from '#foo'
```
