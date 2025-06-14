import { createTypeScriptInferredChecker } from '@volar/kit';
import type { LanguagePlugin } from '@volar/language-core';
import type { Diagnostic } from '@volar/language-service';
import type { URI } from 'vscode-uri';
import { tsMdLanguagePlugin } from './plugin.js';
import type { TsMdDiagnostic, TsMdDiagnosticsResult } from './service.js';
import type { TsMdVirtualFile } from './virtual-file.js';

export function createTsMdChecker(files: string[]) {
  const plugin = tsMdLanguagePlugin as unknown as LanguagePlugin<
    URI,
    TsMdVirtualFile
  >;
  return createTypeScriptInferredChecker([plugin], [], () => files);
}

export async function collectDiagnosticsWithKit(
  files: string[],
): Promise<TsMdDiagnosticsResult> {
  const checker = createTsMdChecker(files);
  const result: TsMdDiagnosticsResult = {};
  for (const file of files) {
    const diags = (await checker.check(file)) as Diagnostic[];
    result[file] = diags.map((d) => ({
      message: d.message,
      range: d.range,
    }));
  }
  return result;
}
