# Release capture

The showcase is the default screen. Release builds omit the reliability-lab
button and Expo development UI, embed the JavaScript bundle, and run without
Metro.

From this directory, build and install the capture binary for one platform:

```sh
bun run capture:ios
bun run capture:android
```

Each command regenerates its native project from `app.json` before compiling a
Release build. Record the installed app with the platform screen recorder, then
keep the original video as the source for GIF encoding. Maestro remains a test
driver for the debug-only reliability lab and is not part of presentation
capture.
