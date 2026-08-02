import type {
  LanguagePlugin,
  LanguageServiceEnvironment,
  ProjectContext,
} from '@volar/language-service';
import { createTypeScriptWorkerLanguageService } from '@volar/monaco/worker';
import type * as monaco from 'monaco-editor';
import * as worker from 'monaco-editor/editor/editor.worker';
import ts from 'typescript';
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript';
import type { URI } from 'vscode-uri';
import { URI as Uri } from 'vscode-uri';
import {
  resolveTsMdFileName,
  tsMdEditorPlugin,
} from './ts-md-language';

self.onmessage = () => {
  worker.initialize((workerContext: monaco.worker.IWorkerContext) => {
    const env: LanguageServiceEnvironment = {
      workspaceFolders: [Uri.parse('file:///')],
    };

    return createTypeScriptWorkerLanguageService({
      typescript: ts,
      compilerOptions: {
        allowNonTsExtensions: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
      },
      env,
      uriConverter: {
        asFileName: (uri) => uri.fsPath,
        asUri: (fileName) => Uri.file(fileName),
      },
      workerContext,
      languagePlugins: [
        tsMdEditorPlugin as unknown as LanguagePlugin<URI>,
      ],
      languageServicePlugins: createTypeScriptServicePlugins(ts),
      setup({ project }) {
        installTsMdModuleResolver(project);
      },
    });
  });
};

function installTsMdModuleResolver(project: ProjectContext) {
  const host = project.typescript?.languageServiceHost;
  if (!host) return;

  const fallbackLiterals = host.resolveModuleNameLiterals?.bind(host);
  const resolveModuleNameLiterals: NonNullable<
    ts.LanguageServiceHost['resolveModuleNameLiterals']
  > = (...args) => {
    const [moduleLiterals, containingFile] = args;
    const fallbackResults = fallbackLiterals?.(...args);
    return moduleLiterals.map((literal, index) => {
      const resolvedModule = resolveTsMdModule(literal.text, containingFile);
      return resolvedModule
        ? { resolvedModule }
        : (fallbackResults?.[index] ?? { resolvedModule: undefined });
    });
  };
  host.resolveModuleNameLiterals = resolveModuleNameLiterals;

  const fallbackNames = host.resolveModuleNames?.bind(host);
  const resolveModuleNames: NonNullable<
    ts.LanguageServiceHost['resolveModuleNames']
  > = (...args) => {
    const [moduleNames, containingFile] = args;
    const fallbackResults = fallbackNames?.(...args);
    return moduleNames.map(
      (moduleName, index) =>
        resolveTsMdModule(moduleName, containingFile) ??
        fallbackResults?.[index],
    );
  };
  host.resolveModuleNames = resolveModuleNames;
}

function resolveTsMdModule(
  specifier: string,
  containingFile: string,
): ts.ResolvedModuleFull | undefined {
  const resolvedFileName = resolveTsMdFileName(specifier, containingFile);
  if (!resolvedFileName) return;

  return {
    resolvedFileName,
    extension: ts.Extension.Ts,
    isExternalLibraryImport: false,
  };
}
