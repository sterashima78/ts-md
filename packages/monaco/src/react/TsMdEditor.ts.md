# React エディターに TS-MD worker を接続する

React コンポーネントは、`@monaco-editor/react` が公開する実際の `Editor` コンポーネントを描画します。一方、`useMonaco` フックは読み込み済みの Monaco 名前空間を取得するために使い、そのインスタンスへ TS-MD の言語機能を登録します。

モデルのパスが `.ts.md` で終わることは重要です。Volar はファイル名から TS-MD 文書を判定するため、Monaco 上の言語 ID が正しくても、一般的なインメモリ URI では TS-MD の言語プラグインの対象になりません。

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
