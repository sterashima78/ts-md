# Activating TS-MD in a browser editor

Importing the browser entry performs the operations required before a `.ts.md` model can receive language features: register the language identifier and start the Volar worker configured by the host's `MonacoEnvironment.getWorker` implementation.

Worker creation remains exported for hosts that need to pass a bundled worker explicitly or control its lifecycle. The default side effect keeps the package's existing one-import setup behavior.

```ts main
import * as monaco from 'monaco-editor';
import { createTsMdWorker } from './createWorker';

export { createTsMdWorker } from './createWorker';

const registration = createTsMdWorker(monaco);
registration.ready.then(() => {
  console.log('TS-MD language worker ready');
});
```
