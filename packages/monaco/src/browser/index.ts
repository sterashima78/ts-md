import * as monaco from 'monaco-editor';

// ts-md を Monaco に追加
monaco.languages.register({ id: 'ts-md', extensions: ['.ts.md'] });

// provideCompletionItem 等は volar が行うので worker 起動は利用側に任せる
