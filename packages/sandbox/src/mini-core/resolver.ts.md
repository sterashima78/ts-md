# Resolver

```ts main
export function resolveImport(specifier: string, importer: string): string {
  return `${importer}/${specifier}`
}
```
