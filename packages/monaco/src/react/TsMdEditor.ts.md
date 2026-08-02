# Binding the TS-MD worker to a React editor

The React component renders the actual `Editor` export from `@monaco-editor/react`. The `useMonaco` hook has a different role: it yields the loaded Monaco namespace, which is then used to register TS-MD language features.

A model path ending in `.ts.md` is essential. Volar identifies TS-MD documents from their file name, so a generic in-memory URI would leave the document outside the TS-MD language plugin even if Monaco's visible language ID were correct.

```tsx main
import Editor, {
  type EditorProps,
  useMonaco,
} from '@monaco-editor/react';
import * as React from 'react';
import { createTsMdWorker } from '../browser/createWorker';

export interface TsMdEditorProps
  extends Omit<EditorProps, 'language' | 'value' | 'onChange'> {
  value: string;
  onChange?: (value: string) => void;
}

export const TsMdEditor: React.FC<TsMdEditorProps> = ({
  value,
  onChange,
  height = '100%',
  path,
  options,
  ...editorProps
}) => {
  const monaco = useMonaco();
  const generatedPath = React.useId().replaceAll(':', '_');
  const modelPath = path ?? `file:///ts-md-${generatedPath}.ts.md`;

  React.useEffect(() => {
    if (!monaco) return;

    const registration = createTsMdWorker(
      monaco as typeof import('monaco-editor'),
    );
    return () => registration.dispose();
  }, [monaco]);

  return (
    <Editor
      {...editorProps}
      language="ts-md"
      path={modelPath}
      value={value}
      onChange={(nextValue) => onChange?.(nextValue ?? '')}
      height={height}
      theme="vs-dark"
      options={{
        wordWrap: 'on',
        minimap: { enabled: false },
        ...options,
      }}
    />
  );
};
```
