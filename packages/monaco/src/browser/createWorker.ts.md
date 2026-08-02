# Connecting TS-MD to Monaco's TypeScript worker

The browser integration does not implement completion, diagnostics, or navigation itself. It supplies the shared TS-MD language plugin to Volar's Monaco worker so browser editing uses the same virtual-file model as the VS Code extension.

Keeping this function small makes the boundary explicit: Monaco owns models and providers, Volar owns language-service orchestration, and `ls-core` owns the TS-MD document mapping.

```ts main
import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import { createTSWorker } from '@volar/monaco';
import type * as monaco from 'monaco-editor';

export function createTsMdWorker(m: typeof monaco) {
  return createTSWorker(m, {
    plugins: [createTsMdPlugin],
  });
}
```
