# Activating TS-MD in a browser editor

Importing the browser entry performs the two operations required before a `.ts.md` model can receive language features: register the language identifier with Monaco and start the Volar worker configured for TS-MD.

Worker creation remains exported for hosts that need to control startup explicitly. The default side effect keeps the package's existing one-import setup behavior.

```ts main
import * as monaco from 'monaco-editor';
import { createTsMdWorker } from './createWorker';

export { createTsMdWorker } from './createWorker';

monaco.languages.register({ id: 'ts-md', extensions: ['.ts.md'] });

createTsMdWorker(monaco).then(() => {
  console.log('TS-MD language worker ready');
});
```
