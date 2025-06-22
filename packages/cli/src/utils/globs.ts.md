# glob 展開

```ts main
import fg from 'fast-glob';

export async function expandGlobs(globs: string[]): Promise<string[]> {
  return fg(globs.length ? globs : ['**/*.ts.md'], { absolute: true });
}
```
