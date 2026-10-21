import { describe, expect, test } from 'bun:test';

import {
  resolveNativeFontMetrics,
  resolveNativeFontWeight,
} from '../typography';

describe('native typography', () => {
  test('preserves an omitted font weight for intrinsic custom-font faces', () => {
    expect(resolveNativeFontWeight(undefined)).toBeUndefined();
  });

  test('serializes explicit named and numeric font weights', () => {
    expect(resolveNativeFontWeight('bold')).toBe('bold');
    expect(resolveNativeFontWeight(300)).toBe('300');
  });
});

describe('native font metrics', () => {
  const largeText = {
    allowFontScaling: true,
    fontScale: 1.3,
    fontSize: 48,
    letterSpacing: 1,
    lineHeight: 56,
    maxFontSizeMultiplier: 1.1,
  };

  test('leaves Android font scaling to the native SP conversion', () => {
    expect(
      resolveNativeFontMetrics({ ...largeText, platform: 'android' })
    ).toEqual({
      allowFontScaling: true,
      fontScale: 1.3,
      fontSize: 48,
      letterSpacing: 1,
      lineHeight: 56,
      maxFontSizeMultiplier: 1.1,
    });
  });

  test('pre-scales iOS font size and line height up to the multiplier', () => {
    const metrics = resolveNativeFontMetrics({ ...largeText, platform: 'ios' });

    expect(metrics.fontSize).toBeCloseTo(52.8);
    expect(metrics.lineHeight).toBeCloseTo(61.6);
    expect(metrics.letterSpacing).toBe(1);
  });

  test('passes Android an uncapped multiplier and scaling opt-out', () => {
    expect(
      resolveNativeFontMetrics({
        ...largeText,
        allowFontScaling: false,
        lineHeight: undefined,
        maxFontSizeMultiplier: undefined,
        platform: 'android',
      })
    ).toEqual({
      allowFontScaling: false,
      fontScale: 1.3,
      fontSize: 48,
      letterSpacing: 1,
      lineHeight: 0,
      maxFontSizeMultiplier: 0,
    });
  });

  test('sends a safe fontScale so Android re-resolves on scale changes', () => {
    expect(
      resolveNativeFontMetrics({
        ...largeText,
        fontScale: Number.NaN,
        platform: 'android',
      })
    ).toMatchObject({ fontScale: 1, fontSize: 48, lineHeight: 56 });
  });

  test('keeps iOS unscaled when font scaling is off', () => {
    expect(
      resolveNativeFontMetrics({
        ...largeText,
        allowFontScaling: false,
        platform: 'ios',
      })
    ).toMatchObject({ fontSize: 48, lineHeight: 56 });
  });
});
