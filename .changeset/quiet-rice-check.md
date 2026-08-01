---
"@sterashima78/ts-md-cli": minor
"@sterashima78/ts-md-tsc": patch
---

Make `tsmd check` type-check the configured TypeScript project by delegating to `ts-md-tsc --noEmit`, and remove the previous glob-based inferred-project checker.

Declare TypeScript as a direct runtime dependency of `@sterashima78/ts-md-tsc`.
