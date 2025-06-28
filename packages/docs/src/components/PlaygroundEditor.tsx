import { useEffect, useState } from 'react';

export const PlaygroundEditor = () => {
  const [Editor, setEditor] = useState<React.ComponentType<
    Record<string, unknown>
  > | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    import('@sterashima78/ts-md-monaco').then((mod) => {
      setEditor(
        () => mod.TsMdEditor as React.ComponentType<Record<string, unknown>>,
      );
    });
  }, []);

  if (!Editor) return null;

  return (
    <Editor value={code} onChange={(v) => setCode(v ?? '')} height="400px" />
  );
};
