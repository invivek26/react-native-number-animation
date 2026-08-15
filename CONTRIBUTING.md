# Contributing

Contributions are welcome. By participating, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- Bun 1.3.11 (the version pinned in `package.json`)
- Node.js 20.19.4 or newer for React Native and Expo tooling
- Android Studio and JDK 17 for Android native work
- macOS and an Xcode version supported by Expo SDK 56 for iOS native work
- CocoaPods for iOS dependency installation

This repository uses Bun workspaces. Do not use npm, Yarn, or pnpm to install or
change dependencies.

## Set up

```sh
git clone https://github.com/invivek26/react-native-number-animation.git
cd react-native-number-animation
bun install --frozen-lockfile
```

The root is the library and `example/` is an Expo SDK 56 development-build app
linked to the local package. Expo Go cannot load the native Fabric component.

```sh
cd example
bunx expo prebuild
bun run ios
# or: bun run android
```

JavaScript changes are picked up by Metro. Rebuild the development app after
changing `ios/`, `android/`, the podspec, or the codegen component specification.

## Validate a change

Run the same aggregate check used for release artifacts:

```sh
bun run check
```

That checks formatting, lint, strict TypeScript, Bun tests, and the distributable
build. Useful focused commands are:

```sh
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
bun run --cwd example build:web
```

CI additionally regenerates Fabric bindings, packs the publish tarball and
installs that exact file into a clean consumer, prebuilds and compiles the Expo
56 Android and iOS apps, verifies CocoaPods static frameworks, and exports web.

## Native and architecture expectations

The supported baseline is React Native 0.85+, iOS 17+, Android API 24+, and the
New Architecture only. Preserve the static web fallback and accessibility
semantics when changing native behavior. Test rapid interrupted updates,
reduced motion, dynamic type/font scaling, right-to-left layout, locale-specific
digits, and both cubic Bézier and spring timing when relevant.

Frame-by-frame work belongs in the native renderer. Keep JavaScript responsible
for formatting and transition planning, and avoid adding per-frame bridge
traffic or React renders. Include before/after profile evidence with changes
that claim a performance improvement.

## Releases

Use Conventional Commits so release notes remain readable. Maintainers use
`bun run release` for stable releases and `bun run release:next` for `next`
prereleases. Both commands run the complete verification suite before creating
a version commit and tag.

The GitHub Release workflow verifies and archives tagged releases. It does not
publish to npm until trusted publishing is enabled for this repository.

## Pull requests

- Keep each pull request focused and describe the observable behavior.
- Add or update tests for motion planning and formatting logic.
- Document public API and compatibility changes.
- Confirm `bun run check` passes.
- Never commit generated native projects under `example/android` or
  `example/ios`, build directories, or package tarballs.
- Open an issue or discussion before a large API or architecture change.

Please report security-sensitive issues privately to
[vivek@gamestock.app](mailto:vivek@gamestock.app) instead of opening a public
issue.
