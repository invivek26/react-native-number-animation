# Changesets

Add a changeset for every user-visible change:

```sh
bun changeset
```

Choose `patch`, `minor`, or `major` according to semantic versioning and explain
the impact for package consumers. Documentation-only, test-only, and CI-only
changes do not need a changeset.

Maintainers create stable or `next` version pull requests from the Release
workflow. That workflow never publishes to npm. npm publishing is intentionally
manual until trusted publishing is enabled and reviewed.
