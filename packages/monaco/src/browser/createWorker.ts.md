# Connecting TS-MD language features to Monaco

Monaco separates the editor UI from language features. The editor owns text models, while Volar exposes completion, diagnostics, navigation, and the other language-service capabilities through a web worker.

`createTsMdWorker` joins those two sides for every model whose language is `ts-md`. Monaco 0.56 creates its worker bridge from an actual `Worker` rather than an AMD module identifier. A host can therefore pass a bundled worker explicitly, or provide `MonacoEnvironment.getWorker` as it already does for Monaco's other workers.

## Registering the language

Language registration must happen before a model is synchronized with the worker. Registration is idempotent so several editors can be mounted without asking Monaco to define the same language repeatedly.

```ts language
import type * as monaco from 'monaco-editor';

export const TS_MD_LANGUAGE_ID = 'ts-md';

export function registerTsMdLanguage(m: typeof monaco) {
  if (m.languages.getLanguages().some(({ id }) => id === TS_MD_LANGUAGE_ID)) {
    return;
  }

  m.languages.register({
    id: TS_MD_LANGUAGE_ID,
    extensions: ['.ts.md'],
  });
  m.languages.setLanguageConfiguration(TS_MD_LANGUAGE_ID, {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
  });
}
```

## Resolving the bundled worker

The explicit worker option is useful for tests and hosts that do not install a global Monaco environment. The fallback follows Monaco's own worker-loader contract and asks the environment for the worker associated with the `ts-md` label.

```ts worker
import { TS_MD_LANGUAGE_ID } from ':language';

export interface TsMdWorkerOptions {
  readonly worker?: Worker | Promise<Worker>;
}

interface MonacoWorkerEnvironment {
  getWorker?(
    moduleId: string,
    label: string,
  ): Worker | Promise<Worker>;
}

export function resolveWorker(options: TsMdWorkerOptions) {
  if (options.worker) return options.worker;

  const environment = (
    globalThis as typeof globalThis & {
      MonacoEnvironment?: MonacoWorkerEnvironment;
    }
  ).MonacoEnvironment;
  if (!environment?.getWorker) {
    throw new Error(
      'TS-MD requires options.worker or MonacoEnvironment.getWorker.',
    );
  }

  return environment.getWorker('workerMain.js', TS_MD_LANGUAGE_ID);
}
```

## Owning the worker lifecycle

Volar registers Monaco providers asynchronously because it first reads capabilities from the worker. The returned registration therefore exposes a `ready` promise for callers that need to wait before invoking a language feature, while `dispose` remains safe both before and after provider registration completes.

```ts main
import { activateMarkers } from '@volar/monaco/lib/editor.js';
import { registerProviders } from '@volar/monaco/lib/languages.js';
import type { WorkerLanguageService } from '@volar/monaco/worker';
import type * as monaco from 'monaco-editor';
import { TS_MD_LANGUAGE_ID, registerTsMdLanguage } from ':language';
import { type TsMdWorkerOptions, resolveWorker } from ':worker';

export { TS_MD_LANGUAGE_ID, registerTsMdLanguage } from ':language';
export type { TsMdWorkerOptions } from ':worker';

export interface TsMdWorkerRegistration extends monaco.IDisposable {
  readonly worker: monaco.editor.MonacoWebWorker<WorkerLanguageService>;
  readonly ready: Promise<void>;
}

export function createTsMdWorker(
  m: typeof monaco,
  options: TsMdWorkerOptions = {},
): TsMdWorkerRegistration {
  registerTsMdLanguage(m);

  const worker = m.editor.createWebWorker<WorkerLanguageService>({
    worker: resolveWorker(options),
  });
  const getSyncedUris = () =>
    m.editor
      .getModels()
      .filter((model) => model.getLanguageId() === TS_MD_LANGUAGE_ID)
      .map((model) => model.uri);

  const markers = activateMarkers(
    worker,
    [TS_MD_LANGUAGE_ID],
    'ts-md-markers',
    getSyncedUris,
    m.editor,
  );

  let providers: monaco.IDisposable | undefined;
  let disposed = false;
  const ready = registerProviders(
    worker,
    [TS_MD_LANGUAGE_ID],
    getSyncedUris,
    m.languages,
  ).then((registration: monaco.IDisposable) => {
    if (disposed) {
      registration.dispose();
      return;
    }
    providers = registration;
  });

  return {
    worker,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      providers?.dispose();
      markers.dispose();
      worker.dispose();
    },
  };
}
```
