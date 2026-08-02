import { loader } from '@monaco-editor/react';
import { cleanup, render, waitFor } from '@testing-library/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTsMdWorker } from '../src/browser/createWorker';
import { TsMdEditor } from '../src/react/TsMdEditor';
import TsMdWorker from './fixtures/ts-md.worker?worker';

const source = [
  '# Completion test',
  '',
  '```ts values',
  'export interface User {',
  '  name: string',
  '  age: number',
  '}',
  "export const user: User = { name: 'Ada', age: 36 }",
  '```',
  '',
  '```ts main',
  "import { user } from ':values'",
  'user.',
  '```',
  '',
].join('\n');

beforeAll(() => {
  loader.config({ monaco });

  const scope = globalThis as typeof globalThis & {
    MonacoEnvironment?: {
      getWorker(moduleId: string, label: string): Worker;
    };
  };
  scope.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      return label === 'ts-md' ? new TsMdWorker() : new EditorWorker();
    },
  };
});

afterEach(() => {
  cleanup();
  for (const model of monaco.editor.getModels()) {
    model.dispose();
  }
  for (const container of document.querySelectorAll('[data-ts-md-test]')) {
    container.remove();
  }
});

describe('Monaco browser integration', () => {
  it('renders TsMdEditor with a real Monaco editor', async () => {
    let editor: monaco.editor.IStandaloneCodeEditor | undefined;

    render(
      <TsMdEditor
        height={320}
        path="file:///component.ts.md"
        value={source}
        onMount={(mountedEditor) => {
          editor = mountedEditor;
        }}
      />,
    );

    await waitFor(() => expect(editor).toBeDefined(), { timeout: 10_000 });
    expect(document.querySelector('.monaco-editor')).not.toBeNull();
    expect(editor?.getModel()?.getLanguageId()).toBe('ts-md');
    expect(editor?.getModel()?.uri.toString()).toBe('file:///component.ts.md');
  });

  it('shows TypeScript IntelliSense from another code block', async () => {
    const container = document.createElement('div');
    container.dataset.tsMdTest = '';
    container.style.width = '800px';
    container.style.height = '500px';
    document.body.append(container);

    const registration = createTsMdWorker(monaco, {
      worker: new TsMdWorker(),
    });
    await registration.ready;

    const model = monaco.editor.createModel(
      source,
      'ts-md',
      monaco.Uri.file('/intellisense.ts.md'),
    );
    const editor = monaco.editor.create(container, {
      model,
      minimap: { enabled: false },
    });

    const completionOffset = source.indexOf('user.\n') + 'user.'.length;
    editor.setPosition(model.getPositionAt(completionOffset));
    editor.focus();
    editor.trigger(
      'ts-md-browser-test',
      'editor.action.triggerSuggest',
      undefined,
    );

    await waitFor(
      () => {
        const widget = document.querySelector('.suggest-widget.visible');
        expect(widget).not.toBeNull();
        expect(widget?.textContent).toContain('name');
        expect(widget?.textContent).toContain('age');
      },
      { timeout: 20_000, interval: 100 },
    );

    editor.dispose();
    model.dispose();
    registration.dispose();
  }, 30_000);
});
