# ブラウザエディターで TS-MD を有効化する

ブラウザ向けのエントリーポイントを読み込むと、`.ts.md` モデルが言語機能を利用するために必要な処理が実行されます。具体的には、Monaco に言語識別子を登録し、ホスト側の `MonacoEnvironment.getWorker` 実装で構成された Volar worker を起動します。

バンドル済みの worker を明示的に渡したい場合や、worker のライフサイクルをホスト側で管理したい場合に備えて、worker の作成関数も公開します。デフォルトの副作用による初期化は、パッケージを1回 import するだけで設定できる従来の利用方法を維持するためのものです。

```ts main
import * as monaco from 'monaco-editor';
import { createTsMdWorker } from './createWorker';

export { createTsMdWorker } from './createWorker';

const registration = createTsMdWorker(monaco);
registration.ready.then(() => {
  console.log('TS-MD language worker ready');
});
```
