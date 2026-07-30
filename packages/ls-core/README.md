# @sterashima78/ts-md-ls-core

`.ts.md` document に対して TypeScript の診断、補完、hover、navigationを提供する Volar language plugin です。

型検査用とエディタ用で別の変換モデルを持たず、どちらも一つのコードフェンスを一つの仮想 TypeScript module として扱います。

## Exports

- `createTsMdPlugin`
- `createTsMdEditorPlugin`
- `resolveTsMdFileName`
- `createTsMdLanguageService`
- `collectDiagnostics`

`createTsMdPlugin` と `createTsMdEditorPlugin` は同じ module model を使用します。
