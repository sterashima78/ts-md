export type PositionEncoding = 'utf-8' | 'utf-16';

export interface InitializeParams {
  protocolVersion: 1;
  positionEncodings: PositionEncoding[];
  locale?: string;
}

export interface InitializeResult {
  protocolVersion: 1;
  positionEncoding: PositionEncoding;
  diagnosticSource: string;
}

export interface TransformParams {
  fileName: string;
  content: string;
  projectHandle?: string;
}

export type SourceExtension = '.js' | '.jsx' | '.ts' | '.tsx' | '.json';

export enum SpanMapKind {
  Verbatim = 0,
  Atom = 1,
  Alias = 2,
}

export type SpanMapping = [
  virtualStart: number,
  virtualLength: number,
  originalStart: number,
  originalLength: number,
  kind: SpanMapKind,
  features?: number,
];

export interface MapperDiagnostic {
  messageText: string;
  start: number;
  length: number;
  code?: number;
}

export interface MappedOutput {
  text: string;
  extension: SourceExtension;
  mappings?: SpanMapping[];
}

export interface TransformResult extends MappedOutput {
  diagnostics?: MapperDiagnostic[];
  supplemental?: MappedOutput[];
}

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
  };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
