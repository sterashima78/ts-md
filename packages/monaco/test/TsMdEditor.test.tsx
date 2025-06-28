import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/browser/createWorker', () => ({
  __esModule: true,
}));

vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: vi.fn(() => vi.fn(() => <div>editor</div>)),
}));

import useMonaco from '@monaco-editor/react';
import '../src/browser/createWorker';

import { TsMdEditor } from '../src/react/TsMdEditor';

describe('TsMdEditor', () => {
  it('renders editor', async () => {
    render(<TsMdEditor value="" />);
    await waitFor(() => expect(useMonaco).toHaveBeenCalled());
  });
});
