# Changesets

SuperJS uses [Changesets](https://github.com/changesets/changesets) for versioning.

Run `npx changeset` to add a changeset to your PR. Every PR that modifies
`packages/compiler-types/src/` MUST include a changeset declaring the bump category.
See `packages/compiler-types/SEMVER.md` for the bump policy.
