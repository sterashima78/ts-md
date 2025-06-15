# Parser

```ts parser
import { extIsTs } from './utils.ts.md:utils'

export interface ChunkDict {
  [name: string]: string
}

export function parse(input: string): ChunkDict {
  return extIsTs(input) ? { main: input } : {}
}
```
