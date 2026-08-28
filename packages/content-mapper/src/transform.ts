import {
  parseDocument,
  type TsMdModule,
  TsMdParseError,
} from '@sterashima78/ts-md-core';
import {
  type MapperDiagnostic,
  SpanMapKind,
  type TransformParams,
  type TransformResult,
} from './protocol.js';

export const DIAGNOSTIC_SOURCE = 'ts-md-content-mapper';

function diagnosticLength(content: string, start: number): number {
  return start < content.length ? 1 : 0;
}

function errorResult(
  params: TransformParams,
  messageText: string,
  start = 0,
): TransformResult {
  const diagnostic: MapperDiagnostic = {
    messageText,
    start,
    length: diagnosticLength(params.content, start),
  };

  return {
    text: '',
    extension: '.ts',
    diagnostics: [diagnostic],
  };
}

function mapMainModule(main: TsMdModule): TransformResult {
  return {
    text: main.code,
    extension: main.language === 'tsx' ? '.tsx' : '.ts',
    mappings: [
      [0, main.code.length, main.start, main.code.length, SpanMapKind.Verbatim],
    ],
  };
}

export function transformTsMd(params: TransformParams): TransformResult {
  try {
    const document = parseDocument(params.content, params.fileName);
    const main = document.modules.find((module) => module.name === 'main');

    if (!main) {
      return errorResult(
        params,
        "TS-MD document requires a TypeScript code fence named 'main'.",
      );
    }

    return mapMainModule(main);
  } catch (error) {
    if (error instanceof TsMdParseError) {
      return errorResult(params, error.message, error.offset);
    }

    throw error;
  }
}
