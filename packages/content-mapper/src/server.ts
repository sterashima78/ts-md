import type { Readable, Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import type {
  InitializeParams,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
  TransformParams,
} from './protocol.js';
import { DIAGNOSTIC_SOURCE, transformTsMd } from './transform.js';

const HEADER_SEPARATOR = Buffer.from('\r\n\r\n', 'ascii');

class ContentLengthReader {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): JsonRpcRequest[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: JsonRpcRequest[] = [];

    for (;;) {
      const headerEnd = this.buffer.indexOf(HEADER_SEPARATOR);
      if (headerEnd === -1) return messages;

      const header = this.buffer.subarray(0, headerEnd).toString('ascii');
      const lengthMatch = /^Content-Length:\s*(\d+)\s*$/im.exec(header);
      if (!lengthMatch) {
        throw new Error('Content mapper request is missing Content-Length.');
      }

      const contentLength = Number.parseInt(lengthMatch[1], 10);
      const bodyStart = headerEnd + HEADER_SEPARATOR.length;
      const bodyEnd = bodyStart + contentLength;
      if (this.buffer.length < bodyEnd) return messages;

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.subarray(bodyEnd);
      messages.push(JSON.parse(body) as JsonRpcRequest);
    }
  }
}

function writeMessage(output: Writable, response: JsonRpcResponse): void {
  const body = JSON.stringify(response);
  const length = Buffer.byteLength(body, 'utf8');
  output.write(`Content-Length: ${length}\r\n\r\n${body}`);
}

function success(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function failure(
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
}

function handleRequest(request: JsonRpcRequest): JsonRpcResponse | undefined {
  const id = request.id ?? null;

  try {
    switch (request.method) {
      case 'initialize': {
        const params = request.params as InitializeParams;
        if (params.protocolVersion !== 1) {
          return failure(
            id,
            -32602,
            'Unsupported content mapper protocol version.',
          );
        }
        if (!params.positionEncodings.includes('utf-16')) {
          return failure(id, -32602, 'UTF-16 position encoding is required.');
        }
        return success(id, {
          protocolVersion: 1,
          positionEncoding: 'utf-16',
          diagnosticSource: DIAGNOSTIC_SOURCE,
        });
      }
      case 'openProject':
        return success(id, { configIdentity: 'ts-md-content-mapper-poc-v1' });
      case 'closeProject':
        return success(id, null);
      case 'transform':
        return success(id, transformTsMd(request.params as TransformParams));
      default:
        return request.id === undefined
          ? undefined
          : failure(id, -32601, `Unknown method '${request.method}'.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return request.id === undefined ? undefined : failure(id, -32603, message);
  }
}

export function runServer(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): void {
  const reader = new ContentLengthReader();

  input.on('data', (chunk: Buffer | string) => {
    try {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      for (const request of reader.push(data)) {
        const response = handleRequest(request);
        if (response) writeMessage(output, response);
      }
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      process.stderr.write(`${message}\n`);
    }
  });
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  runServer();
}
