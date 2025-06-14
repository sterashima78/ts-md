---
"@sterashima78/ts-md-cli": minor
"@sterashima78/ts-md-sandbox": patch
---
CLI で check コマンドに TypeScript オプションを渡せるようにしました。sandbox の typecheck では --noEmit を、postbuild では --emitDeclarationOnly を使用します。また、tsconfig に `.ts.md` を含め、ファイルグロブを渡さずにチェックするようにしました。
