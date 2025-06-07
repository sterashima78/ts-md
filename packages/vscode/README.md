# TS-MD VS Code Extension

This extension provides language support for `.ts.md` files.

- TypeScript-aware completion and diagnostics
- CodeLens to run individual chunks or tests
- Commands: **TS-MD: Run Test**, **TS-MD: Run Chunk**, **TS-MD: Tangle**

## Development

```bash
pnpm -F @sterashima78/ts-md-vscode build
code --extensionDevelopmentPath=packages/vscode
```

## Structure
- `src/extension.ts` – extension entry point
- `src/server/` – language server implementation
- `src/codelens.ts` – adds CodeLens for chunks
- `src/commands.ts` – commands invoking the CLI
- `syntaxes/` – TextMate grammar for highlighting
