import * as monaco from 'monaco-editor';
import { createTsMdWorker } from './createWorker';

export { createTsMdWorker } from './createWorker';

// ts-md を Monaco に追加
monaco.languages.register({ id: 'ts-md', extensions: ['.ts.md'] });

// provideCompletionItem 等は volar が行うので worker 起動のみ
createTsMdWorker(monaco).then(() => {
  console.log('TS-MD language worker ready');
});
