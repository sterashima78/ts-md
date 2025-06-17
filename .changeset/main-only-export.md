---
"@sterashima78/ts-md-core": major
"@sterashima78/ts-md-unplugin": major
"@sterashima78/ts-md-ls-core": major
---
チャンク名を指定した `.ts.md` ファイル間のインポートを廃止し、
`main` チャンクのみを他ファイルから参照できる仕様に変更しました。
他のチャンクは同一ファイル内でのみ参照できます。
