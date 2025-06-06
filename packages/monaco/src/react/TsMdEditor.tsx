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
  )(); // dynamic import

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
