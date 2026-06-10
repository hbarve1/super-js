# @superjs/compiler-types Versioning Policy

This package is consumed by every SuperJS compiler stage. Breaking changes require a **major** version bump.

## Bump categories

| Change type | Bump |
|---|---|
| Add optional field to existing interface | **patch** |
| Add new exported interface or type | **minor** |
| Add required field to existing interface | **major** |
| Remove or rename exported symbol | **major** |
| Change type of existing field | **major** |

## PR requirement

Every PR that modifies `src/` MUST include a changeset entry declaring the bump category. CI rejects PRs that change `src/` without a changeset. Use:

```bash
npx changeset add
```

When prompted, describe the change and select the bump category from the table above.
