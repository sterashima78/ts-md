# Graph

```ts graph
import { parse } from '#./parser.ts.md:parser'
import { resolveImport } from '#./resolver.ts.md:resolver'

export function detectCycle(entry: string): string {
  parse(entry)
  return resolveImport(entry, entry)
}
```
