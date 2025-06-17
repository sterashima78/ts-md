# Parser

```ts main
import { extIsTs } from './utils.ts.md'

export interface ChunkDict {
  [name: string]: string
}

export function parse(input: string): ChunkDict {
  return extIsTs(input) ? { main: input } : {}
}
```
