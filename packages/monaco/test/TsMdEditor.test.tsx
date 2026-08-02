import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  monaco: { editor: {}, languages: {} },
}));

vi.mock('../src/browser/createWorker', () => ({
  createTsMdWorker: vi.fn(() => ({
    dispose: mocks.dispose,
    ready: Promise.resolve(),
    worker: {},
  })),
}));

vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ language, path }: { language?: string; path?: string }) => (
    <div data-language={language} data-path={path} data-testid="editor" />
  )),
  useMonaco: vi.fn(() => mocks.monaco),
}));

import { createTsMdWorker } from '../src/browser/createWorker';
import { TsMdEditor } from '../src/react/TsMdEditor';

describe('TsMdEditor', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders a ts-md model and starts the language worker', async () => {
    const rendered = render(<TsMdEditor value="" />);

    await waitFor(() =>
      expect(createTsMdWorker).toHaveBeenCalledWith(mocks.monaco),
    );
    const editor = rendered.getByTestId('editor');
    expect(editor.dataset.language).toBe('ts-md');
    expect(editor.dataset.path).toMatch(/^file:\/\/\/ts-md-.+\.ts\.md$/);

    rendered.unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it('keeps an explicit ts-md model path', () => {
    const rendered = render(
      <TsMdEditor path="file:///workspace/example.ts.md" value="" />,
    );

    expect(rendered.getByTestId('editor').dataset.path).toBe(
      'file:///workspace/example.ts.md',
    );
  });
});
