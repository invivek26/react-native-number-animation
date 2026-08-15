import { describe, expect, test } from 'bun:test';

import { resolveNativeFontWeight } from '../typography';

describe('native typography', () => {
  test('preserves an omitted font weight for intrinsic custom-font faces', () => {
    expect(resolveNativeFontWeight(undefined)).toBeUndefined();
  });

  test('serializes explicit named and numeric font weights', () => {
    expect(resolveNativeFontWeight('bold')).toBe('bold');
    expect(resolveNativeFontWeight(300)).toBe('300');
  });
});
