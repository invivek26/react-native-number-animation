# Maestro gallery flows

Install the SDK 56 development build on the selected simulator/emulator and
start Metro from `example/` before running a flow.

```sh
maestro test maestro/ios-smoke.yaml
maestro test maestro/ios-stress.yaml
maestro test maestro/android-smoke.yaml
maestro test maestro/android-stress.yaml
```

The platform-specific files intentionally share the same fixed app ID and
deterministic test IDs. Smoke flows cover interaction and gallery reachability;
stress flows keep 24 native counters updating while scrolling away and back.
