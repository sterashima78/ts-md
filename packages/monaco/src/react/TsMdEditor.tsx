import useMonaco from '@monaco-editor/react';
import type * as React from 'react';

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
