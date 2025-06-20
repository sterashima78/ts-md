# Utils

```ts main
import crypto from 'node:crypto';

export function hash(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex');
}

export function extIsTs(lang: string): boolean {
  return lang === 'ts' || lang === 'tsx';
}

export function escapeChunk(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
```

