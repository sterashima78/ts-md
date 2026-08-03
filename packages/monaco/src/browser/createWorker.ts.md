# Monaco に TS-MD の言語機能を接続する

Monaco では、エディターの UI と言語機能が分離されています。エディターはテキストモデルを管理し、Volar は補完、診断、定義への移動などの言語サービス機能を Web Worker 経由で提供します。

`createTsMdWorker` は、言語が `ts-md` である各モデルについて、この2つを接続します。Monaco 0.56 では AMD のモジュール識別子ではなく、実際の `Worker` を使って worker との橋渡しを作成します。そのため、ホストはバンドル済みの worker を明示的に渡すか、Monaco のほかの worker と同様に `MonacoEnvironment.getWorker` を提供できます。

## 言語を登録する

モデルを worker と同期する前に、言語を登録しておく必要があります。複数のエディターをマウントしても同じ言語を重複して定義しないように、登録処理は冪等にしています。

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

## バンドル済み worker を解決する

worker を明示的に指定できるオプションは、テストやグローバルな Monaco 環境を設定しないホストで利用できます。明示的な指定がない場合は Monaco の worker ローダーの規約に従い、`ts-md` ラベルに対応する worker を環境から取得します。

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

## worker のライフサイクルを管理する

Volar は最初に worker から機能情報を読み取るため、Monaco の provider を非同期に登録します。そこで、言語機能を呼び出す前に待機したい利用者向けに `ready` Promise を公開します。また、provider の登録前後のどちらでも安全に破棄できるように `dispose` を実装します。

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
