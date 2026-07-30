export {
  createVirtualModuleFileName,
  parseDocument,
  parseVirtualModuleFileName,
  resolveImport,
  TS_MD_VIRTUAL_MODULE_MARKER,
} from '@sterashima78/ts-md-core';
export type {
  TsMdDocument,
  TsMdModule,
} from '@sterashima78/ts-md-core';
export {
  resolveTsMdFileName,
  tsMdEditorLanguagePlugin as createTsMdEditorPlugin,
  tsMdLanguagePlugin as createTsMdPlugin,
} from './plugin.ts.md';
export {
  collectDiagnostics,
  createTsMdLanguageService,
  type TsMdDiagnostic,
  type TsMdDiagnosticsResult,
} from './service.ts.md';
export type { TsMdVirtualFile } from './virtual-file.ts.md';
