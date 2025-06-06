import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import { createTSWorker } from '@volar/monaco';
import type * as monaco from 'monaco-editor';

/**
 * 起動済み Worker インスタンスを返すだけの薄いヘルパ。
 * ホスト側で `monaco.languages.register` は不要。
 */
export function createTsMdWorker(m: typeof monaco) {
  return createTSWorker(m, {
    plugins: [createTsMdPlugin],
  });
}
