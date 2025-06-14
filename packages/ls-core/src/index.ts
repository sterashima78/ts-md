export { tsMdLanguagePlugin as createTsMdPlugin } from './plugin.js';
export type { TsMdVirtualFile } from './virtual-file.js';
export {
  createTsMdLanguageService,
  collectDiagnostics,
  type TsMdDiagnostic,
  type TsMdDiagnosticsResult,
} from './service.js';
export {
  createTsMdChecker,
  collectDiagnosticsWithKit,
} from './checker.js';
