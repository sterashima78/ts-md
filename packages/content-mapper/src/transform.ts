import {
  parseDocument,
  type TsMdModule,
  TsMdParseError,
} from '@sterashima78/ts-md-core';
import {
  type MappedOutput,
  type MapperDiagnostic,
  SpanMapKind,
  type TransformParams,
  type TransformResult,
} from './protocol.js';

export const DIAGNOSTIC_SOURCE = 'ts-md-content-mapper';

const MODULE_MARKER = '\nexport {};';

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

function mapModule(module: TsMdModule): MappedOutput {
  return {
    text: `${module.code}${MODULE_MARKER}`,
    extension: module.language === 'tsx' ? '.tsx' : '.ts',
    mappings: [
      [
        0,
        module.code.length,
        module.start,
        module.code.length,
        SpanMapKind.Verbatim,
      ],
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

    return {
      ...mapModule(main),
      supplemental: document.modules
        .filter((module) => module.name !== 'main')
        .map(mapModule),
    };
  } catch (error) {
    if (error instanceof TsMdParseError) {
      return errorResult(params, error.message, error.offset);
    }

    throw error;
  }
}
