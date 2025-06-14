export { tsMdLanguagePlugin as createTsMdPlugin } from './plugin.js';
export type { TsMdVirtualFile } from './virtual-file.js';
export {
  createTsMdLanguageService,
  collectDiagnostics,
  emitDeclarations,
  type TsMdDiagnostic,
  type TsMdDiagnosticsResult,
} from './service.js';
