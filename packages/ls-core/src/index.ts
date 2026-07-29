export {
  tsMdEditorLanguagePlugin as createTsMdEditorPlugin,
  tsMdLanguagePlugin as createTsMdPlugin,
  resolveTsMdFileName,
} from './plugin.ts.md';
export {
  collectDiagnostics,
  createTsMdLanguageService,
  type TsMdDiagnostic,
  type TsMdDiagnosticsResult,
} from './service.ts.md';
export type { TsMdVirtualFile } from './virtual-file.ts.md';
