# Connecting TS-MD language features to Monaco

Monaco separates the editor UI from language features. The editor owns text models, while Volar exposes completion, diagnostics, navigation, and the other language-service capabilities through a web worker.

`createTsMdWorker` joins those two sides for every model whose language is `ts-md`. The caller remains responsible for routing Monaco's `ts-md` worker label to a worker module; this keeps the library independent from a particular bundler while allowing Vite, webpack, and other environments to choose their own worker-loading strategy.

## Registering the language

Language registration must happen before a model is synchronized with the worker. Registration is idempotent so several editors can be mounted without asking Monaco to define the same language repeatedly.

```ts language
import type * as monaco from 'monaco-editor';

export const TS_MD_LANGUAGE_ID = 'ts-md';

function registerTsMdLanguage(m: typeof monaco) {
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

## Owning the worker lifecycle

Volar registers Monaco providers asynchronously because it first reads capabilities from the worker. The returned registration therefore exposes a `ready` promise for callers that need to wait before invoking a language feature, while `dispose` remains safe both before and after provider registration completes.

```ts main
import {
  activateMarkers,
  registerProviders,
} from '@volar/monaco';
import type { WorkerLanguageService } from '@volar/monaco/worker';
import type * as monaco from 'monaco-editor';
import { TS_MD_LANGUAGE_ID, registerTsMdLanguage } from ':language';

export interface TsMdWorkerRegistration extends monaco.IDisposable {
  readonly worker: monaco.editor.MonacoWebWorker<WorkerLanguageService>;
  readonly ready: Promise<void>;
}

export function createTsMdWorker(
  m: typeof monaco,
): TsMdWorkerRegistration {
  registerTsMdLanguage(m);

  const worker = m.editor.createWebWorker<WorkerLanguageService>({
    moduleId: 'vs/language/ts-md/tsMdWorker',
    label: TS_MD_LANGUAGE_ID,
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
  ).then((registration) => {
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
