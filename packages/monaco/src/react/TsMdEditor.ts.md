# Binding the TS-MD worker to a React editor

The React component owns only UI lifecycle. It waits until Monaco is available in the browser, starts the TS-MD worker for that instance, and renders a controlled editor configured with the `ts-md` language identifier.

Worker setup belongs in an effect because Monaco is loaded dynamically. The component remains null until that dependency is available, preventing server-side or early browser renders from touching Monaco globals.

```tsx main
import useMonaco from '@monaco-editor/react';
import * as React from 'react';
import { createTsMdWorker } from '../browser/createWorker';

export interface TsMdEditorProps {
  value: string;
  onChange?: (v: string) => void;
  height?: string | number;
}

export const TsMdEditor: React.FC<TsMdEditorProps> = ({
  value,
  onChange,
  height = '100%',
}) => {
  const MonacoEditor = (
    useMonaco as unknown as () => React.ComponentType<Record<string, unknown>>
  )();

  React.useEffect(() => {
    if (!MonacoEditor) return;
    createTsMdWorker(MonacoEditor as unknown as typeof import('monaco-editor'));
  }, [MonacoEditor]);

  if (!MonacoEditor) return null;

  return (
    <MonacoEditor
      language="ts-md"
      value={value}
      onChange={onChange}
      height={height}
      theme="vs-dark"
      options={{ wordWrap: 'on', minimap: { enabled: false } }}
    />
  );
};
```
