---
'@sterashima78/ts-md-core': minor
'@sterashima78/ts-md-ls-core': minor
'@sterashima78/ts-md-loader': minor
'@sterashima78/ts-md-unplugin': minor
'@sterashima78/ts-md-tsc': minor
'@sterashima78/ts-md-cli': minor
'@sterashima78/ts-md-vscode': minor
'@sterashima78/ts-md-monaco': minor
---

別ファイルの `.ts.md` import は `main` module のみに限定し、名前付き module は `:module` で同じ document 内からだけ参照できるようにしました。
