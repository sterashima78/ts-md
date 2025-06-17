# Graph

```ts main
import { parse } from './parser.ts.md'
import { resolveImport } from './resolver.ts.md'

export function detectCycle(entry: string): string {
  parse(entry)
  return resolveImport(entry, entry)
}
```
