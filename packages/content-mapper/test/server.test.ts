import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runServer } from '../src/server.js';

function createClient() {
  const input = new PassThrough();
  const output = new PassThrough();
  let received = '';
  output.on('data', (chunk: Buffer) => {
    received += chunk.toString('utf8');
  });
  runServer(input, output);

  function send(request: unknown): void {
    const body = JSON.stringify(request);
    input.write(
      Buffer.concat([
        Buffer.from(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`),
        Buffer.from(body),
      ]),
    );
  }

  function messages(): unknown[] {
    const result: unknown[] = [];
    let pending = received;
    while (pending) {
      const end = pending.indexOf('\r\n\r\n');
      if (end < 0) break;
      const header = pending.slice(0, end);
      const length = Number(/^Content-Length: (\d+)$/m.exec(header)?.[1]);
      const bodyStart = end + 4;
      const payload = Buffer.from(pending.slice(bodyStart), 'utf8');
      if (payload.length < length) break;
      result.push(JSON.parse(payload.subarray(0, length).toString('utf8')));
      pending = payload.subarray(length).toString('utf8');
    }
    return result;
  }

  return { input, send, messages };
}

describe('Content Mapper JSON-RPC server', () => {
  it('TypeScript 7.1 Beta initialize では protocolVersion を使用しない', () => {
    const client = createClient();
    client.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { positionEncodings: ['utf-8', 'utf-16'] },
    });
    expect(client.messages()).toEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        result: {
          positionEncoding: 'utf-16',
          diagnosticSource: 'ts-md-content-mapper',
        },
      },
    ]);
    client.input.destroy();
  });

  it('utf-16 を提供しないホストを拒否する', () => {
    const client = createClient();
    client.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { positionEncodings: ['utf-8'] },
    });
    expect(client.messages()).toMatchObject([
      { id: 2, error: { code: -32602 } },
    ]);
    client.input.destroy();
  });

  it('openProject と UTF-8 の JSON-RPC transform を処理する', () => {
    const client = createClient();
    client.send({
      jsonrpc: '2.0',
      id: 3,
      method: 'openProject',
      params: { projectHandle: 'p', compilerOptions: {} },
    });
    client.send({
      jsonrpc: '2.0',
      id: 4,
      method: 'transform',
      params: {
        fileName: '/project/sample.ts.md',
        content: '# 😀\n\n```ts main\nexport const number = 42;\n```\n',
        projectHandle: 'p',
      },
    });
    expect(client.messages()).toMatchObject([
      { id: 3, result: {} },
      {
        id: 4,
        result: {
          text: 'export const number = 42;\nexport {};',
          extension: '.ts',
        },
      },
    ]);
    client.input.destroy();
  });
});
