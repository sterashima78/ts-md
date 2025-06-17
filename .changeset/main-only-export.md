---
"@sterashima78/ts-md-core": minor
"@sterashima78/ts-md-unplugin": minor
"@sterashima78/ts-md-ls-core": minor
---
チャンク名を指定した `.ts.md` ファイル間のインポートを廃止し、
`main` チャンクのみを他ファイルから参照できる仕様に変更しました。
他のチャンクは同一ファイル内でのみ参照できます。
