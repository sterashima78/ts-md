declare module '@volar/monaco' {
  import type * as monaco from 'monaco-editor';
  export function createTSWorker(
    m: typeof monaco,
    opts: { plugins: unknown[] },
  ): Promise<unknown>;
}
