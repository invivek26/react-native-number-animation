# react-native-number-animation

A native rolling-number component for React Native's New Architecture. It keeps
digit, layout, and opacity motion on the native UI thread while React owns
formatting and transition intent.

## Native on both platforms

<table>
  <thead>
    <tr>
      <th>iOS · Core Animation</th>
      <th>Android · Canvas</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <img
          src="https://raw.githubusercontent.com/invivek26/react-native-number-animation/main/docs/assets/ios-showcase.webp"
          alt="Native rolling-number animations on iOS"
          width="420"
        />
      </td>
      <td>
        <img
          src="https://raw.githubusercontent.com/invivek26/react-native-number-animation/main/docs/assets/android-showcase.webp"
          alt="Native rolling-number animations on Android"
          width="420"
        />
      </td>
    </tr>
  </tbody>
</table>

## Compatibility

| Requirement  | Supported                                   |
| ------------ | ------------------------------------------- |
| React Native | 0.85.x                                      |
| React        | 19.2.x                                      |
| Expo         | SDK 56 development builds and prebuilt apps |
| iOS          | 17 and newer                                |
| Android      | API 24 and newer                            |
| Architecture | New Architecture (Fabric) only              |
| Web          | Static, accessible formatted text           |
| Expo Go      | No                                          |

This package contains custom native code, so it cannot run in Expo Go. Use an
[Expo development build](https://docs.expo.dev/develop/development-builds/introduction/)
or a bare React Native app. The Expo 56 example in this repository is the
compatibility fixture used by CI.

## Installation

```sh
bun add react-native-number-animation
```

For Expo, create a development build after installing:

```sh
bunx expo prebuild
bunx expo run:ios
# or: bunx expo run:android
```

For bare iOS projects, install pods after adding the package:

```sh
cd ios && pod install
```

The pod supports CocoaPods static-library and static-framework integrations.

## Quick start

```tsx
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AnimatedNumber } from 'react-native-number-animation';

export const Score = () => {
  const [score, setScore] = useState(1_249);

  return (
    <>
      <AnimatedNumber
        value={score}
        locales="en-US"
        format={{ maximumFractionDigits: 0 }}
        style={{ fontSize: 48, fontVariant: ['tabular-nums'] }}
      />
      <Pressable onPress={() => setScore((value) => value + 1)}>
        <Text>Increase score</Text>
      </Pressable>
    </>
  );
};
```

## Formatting

`AnimatedNumber` uses `Intl.NumberFormat`. Pass either formatting options or a
function that derives options from the current value:

```tsx
<AnimatedNumber
  value={revenue}
  locales="en-US"
  format={{ style: 'currency', currency: 'USD' }}
  prefix="Revenue: "
  suffix=" this month"
/>
```

When text is already formatted by your application, provide `formattedValue`.
If the first render should animate from another preformatted string, both
`initialValue` and `initialFormattedValue` are required:

```tsx
<AnimatedNumber
  value={42}
  formattedValue="42 points"
  initialValue={0}
  initialFormattedValue="0 points"
/>
```

Do not combine `formattedValue` with `locales`, `format`, `prefix`, or `suffix`.
The TypeScript types enforce these input modes.

## Motion

```tsx
<AnimatedNumber
  value={balance}
  trend="auto"
  continuous
  animation={{
    digit: {
      duration: 700,
      easing: { type: 'spring', damping: 18, stiffness: 160 },
    },
    layout: { duration: 350, easing: 'easeOut' },
    opacity: {
      duration: 180,
      easing: { type: 'cubicBezier', x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
    },
  }}
/>
```

- `trend="auto"` follows the numeric delta. Use `up` or `down` to force the
  wheel direction.
- `continuous` rolls unchanged lower-order digits through a full turn when a
  higher-order digit changes, which is useful for odometer-like displays.
- `mask` clips rolling glyphs to the component bounds. Disable it only when the
  transition should remain visible outside the measured line.
- Set `animated={false}` to render updates immediately.

### Global animation control

Use `NumberAnimationProvider` when an app-level setting, performance mode, or
screen state needs to disable every descendant animation:

```tsx
import {
  AnimatedNumber,
  NumberAnimationProvider,
} from 'react-native-number-animation';

export const Portfolio = ({ animationsEnabled, total }) => (
  <NumberAnimationProvider enabled={animationsEnabled}>
    <AnimatedNumber value={total} />
  </NumberAnimationProvider>
);
```

Without a provider, animations remain enabled. Provider state and the local
`animated` prop are both authoritative: either one can disable motion. Nested
providers are false-dominant, so an enabled child cannot override a disabled
ancestor.

Turning the provider off during a transition immediately shows the latest
formatted value, cancels native frame work, and does not emit a completion for
the cancelled transition. Turning it on again does not replay that settled
value; the next value change animates normally. Reduced Motion remains an
additional independent constraint.

Durations are milliseconds and are clamped to 0–60,000. Named easing values are
`linear`, `easeIn`, `easeOut`, and `easeInOut`; cubic Bézier and spring objects
are also supported.

### Interrupted updates

It is safe to update `value` while an animation is running. A newer formatted
value supersedes the active revision, stale native completion events are
ignored, and callbacks describe the revision that actually started or settled.
Because a completion fallback is scheduled in JavaScript, callbacks remain
deterministic if a native animation is interrupted by lifecycle changes.

Avoid using completion callbacks as an accounting ledger. Treat application
state as the source of truth, because an intermediate revision can be
superseded before it completes.

## Accessibility

The wrapper is one accessible element whose default label is the complete
formatted value; individual rolling glyphs are hidden from assistive
technology. Supply `accessibilityLabel` when the visual string is not an ideal
spoken description.

`respectMotionPreference` defaults to `true` and listens to React Native's
[`AccessibilityInfo`](https://reactnative.dev/docs/accessibilityinfo) reduced
motion setting. Reduced motion keeps the readable value update while removing
the digit roll. Set it to `false` only when the surrounding experience provides
an equivalent user-controlled motion setting.

Font scaling is enabled by default. `allowFontScaling` and
`maxFontSizeMultiplier` match React Native text behavior. The component is
single-line; strings containing a newline render as static text.

## API

### `NumberAnimationProvider`

| Prop       | Type        | Default  | Purpose                                  |
| ---------- | ----------- | -------- | ---------------------------------------- |
| `enabled`  | `boolean`   | required | Enables animation for the provider tree. |
| `children` | `ReactNode` | required | Descendant number-animation components.  |

### Value and formatting

| Prop                    | Type                                             | Default         | Purpose                                                   |
| ----------------------- | ------------------------------------------------ | --------------- | --------------------------------------------------------- |
| `value`                 | `number`                                         | required        | Numeric state and trend source.                           |
| `locales`               | `Intl.LocalesArgument`                           | runtime default | Locale passed to `Intl.NumberFormat`.                     |
| `format`                | `Intl.NumberFormatOptions \| (value) => options` | `{}`            | Number formatting options.                                |
| `prefix` / `suffix`     | `string`                                         | `''`            | Static text around an Intl-formatted value.               |
| `formattedValue`        | `string`                                         | —               | App-supplied formatted output; exclusive with Intl props. |
| `initialValue`          | `number`                                         | —               | Optional first-render starting value.                     |
| `initialFormattedValue` | `string`                                         | —               | Required with `initialValue` in preformatted mode.        |

### Animation and presentation

| Prop                      | Type                       | Default          | Purpose                                        |
| ------------------------- | -------------------------- | ---------------- | ---------------------------------------------- |
| `animated`                | `boolean`                  | `true`           | Enables rolling transitions.                   |
| `animation`               | `AnimatedNumberAnimation`  | built-in timings | Independent digit, layout, and opacity timing. |
| `trend`                   | `'auto' \| 'up' \| 'down'` | `'auto'`         | Chooses wheel direction.                       |
| `continuous`              | `boolean`                  | `false`          | Enables odometer-style full turns.             |
| `mask`                    | `boolean`                  | `true`           | Clips rolling content.                         |
| `style`                   | supported text style       | —                | Typography and text color.                     |
| `containerStyle`          | `StyleProp<ViewStyle>`     | —                | Wrapper layout style.                          |
| `respectMotionPreference` | `boolean`                  | `true`           | Honors reduced-motion changes.                 |
| `allowFontScaling`        | `boolean`                  | `true`           | Applies the system font scale.                 |
| `maxFontSizeMultiplier`   | `number`                   | —                | Caps font scaling.                             |

`style` accepts `color`, `fontFamily`, `fontSize`, `fontStyle`, `fontVariant`,
`fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, and
`writingDirection`. Standard `ViewProps`, except `children`, `style`, and the
specialized accessibility label, are forwarded to the container.

### Events

```ts
type AnimationEvent = {
  value: number;
  formattedValue: string;
};
```

`onAnimationStart` fires when the active native revision starts.
`onAnimationComplete` fires at most once when that revision settles. Static web
rendering does not emit native animation events.

## Architecture and performance

React formats the value, splits it into stable semantic slots, and plans digit
deltas. A Fabric codegen component sends that compact plan to native iOS and
Android views. Native render loops own frame-by-frame digit, layout, and opacity
updates, so the JavaScript thread is not asked to render every animation frame.
The native renderer also owns the settled pixels, avoiding a post-animation
geometry handoff to React Native `Text`. At rest, iOS keeps static Core Animation
layers and Android schedules no frame callbacks.

For the best results:

- update the numeric `value`, not a rapidly changing React `key`;
- use `fontVariant: ['tabular-nums']` when fixed-width digits suit the design;
- memoize expensive application-level formatting inputs; the library already
  caches equivalent `Intl.NumberFormat` instances;
- prefer one `AnimatedNumber` for a formatted value over one component per
  digit;
- profile representative release builds, especially in dense lists.

Web deliberately uses a static React Native `Text` fallback. React Native web
bundlers keep exports readable without pretending to provide the native motion
pipeline; this package does not target direct, unbundled Node.js execution.

## Platform notes

- This library is New-Architecture-only and does not include a legacy Paper
  view manager path.
- The minimum supported targets are iOS 17 and Android API 24. Applications may
  target newer versions.
- The formatter feature-detects `formatToParts` and `Segmenter`; runtimes with a
  partial `Intl` implementation fall back to parsing the exact `format()`
  output. Validate non-Hermes runtimes against the locales and options your app
  uses.
- Expo users need a development build after adding or changing the native
  package. Restarting Expo Go is not sufficient.

## Release model

Maintainers use [release-it](https://github.com/release-it/release-it) to create
version commits and tags, with `next` prereleases used to validate native ABI
changes before stable releases. The GitHub Release workflow verifies and packs
the tagged source, submits that exact tarball to npm through stage-only trusted
publishing, then creates a GitHub release. A maintainer reviews and approves the
staged package with 2FA before it becomes public. No long-lived npm publishing
token is stored in GitHub, and trusted publishing adds provenance automatically.

## Acknowledgements

The motion model is inspired by
[NumberFlow](https://github.com/barvian/number-flow), and the Android rendering
approach was informed by
[Robinhood Ticker](https://github.com/robinhood/ticker). This package is an
independent implementation and does not bundle their runtime code. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for license references.

The native component follows React Native's
[Codegen](https://reactnative.dev/docs/the-new-architecture/using-codegen) and
Fabric component model. The project was originally scaffolded with
[create-react-native-library](https://github.com/callstack/react-native-builder-bob).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
