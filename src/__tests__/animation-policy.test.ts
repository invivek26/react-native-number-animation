import { describe, expect, test } from 'bun:test';

import {
  resolveAnimationState,
  shouldHandleAnimationEvent,
} from '../motion/animation-policy';

describe('animation policy', () => {
  test('requires both local and provider animation settings', () => {
    expect(
      resolveAnimationState({
        animated: true,
        isMultiline: false,
        providerEnabled: false,
        revision: 1,
        settledRevision: 0,
      })
    ).toEqual({ active: false, rendererEnabled: false });

    expect(
      resolveAnimationState({
        animated: false,
        isMultiline: false,
        providerEnabled: true,
        revision: 1,
        settledRevision: 0,
      })
    ).toEqual({ active: false, rendererEnabled: false });
  });

  test('does not replay a revision settled while globally disabled', () => {
    expect(
      resolveAnimationState({
        animated: true,
        isMultiline: false,
        providerEnabled: true,
        revision: 4,
        settledRevision: 4,
      })
    ).toEqual({ active: false, rendererEnabled: true });

    expect(
      resolveAnimationState({
        animated: true,
        isMultiline: false,
        providerEnabled: true,
        revision: 5,
        settledRevision: 4,
      })
    ).toEqual({ active: true, rendererEnabled: true });
  });

  test('keeps multiline values static', () => {
    expect(
      resolveAnimationState({
        animated: true,
        isMultiline: true,
        providerEnabled: true,
        revision: 1,
        settledRevision: 0,
      })
    ).toEqual({ active: false, rendererEnabled: false });
  });

  test('rejects queued events after animation is disabled or settled', () => {
    expect(
      shouldHandleAnimationEvent({
        eventRevision: 3,
        rendererEnabled: false,
        revision: 3,
        settledRevision: 2,
      })
    ).toBe(false);
    expect(
      shouldHandleAnimationEvent({
        eventRevision: 3,
        rendererEnabled: true,
        revision: 3,
        settledRevision: 3,
      })
    ).toBe(false);
    expect(
      shouldHandleAnimationEvent({
        eventRevision: 3,
        rendererEnabled: true,
        revision: 3,
        settledRevision: 2,
      })
    ).toBe(true);
  });
});
