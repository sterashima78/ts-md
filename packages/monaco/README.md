# @sterashima78/ts-md-monaco

Utilities to edit `.ts.md` files with Monaco Editor.

## Quick Usage (React)

```tsx
import { TsMdEditor } from '@sterashima78/ts-md-monaco';

function App() {
  return (
    <TsMdEditor value="```ts add\nexport const add = (a,b)=>a+b\n```" />
  );
}
```

### Vanilla

```ts
import * as monaco from 'monaco-editor';
import { createTsMdWorker } from '@sterashima78/ts-md-monaco/browser';

monaco.languages.register({ id: 'ts-md', extensions: ['.ts.md'] });
createTsMdWorker(monaco);
```

> When using via CDN, ensure `monaco-editor` workers are served correctly.
