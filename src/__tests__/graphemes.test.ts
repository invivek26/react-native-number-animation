import { expect, test } from 'bun:test';

import { splitGraphemes } from '../format/graphemes';

test('falls back when Intl.Segmenter creates an object without segment', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
  const value = '👩‍👩‍👧‍👦';

  class SegmenterWithoutSegment {
    public constructor(
      _locales?: Intl.LocalesArgument,
      _options?: Intl.SegmenterOptions
    ) {}
  }

  Object.defineProperty(Intl, 'Segmenter', {
    configurable: true,
    value: SegmenterWithoutSegment,
    writable: true,
  });

  try {
    expect(splitGraphemes(value)).toEqual(Array.from(value));
  } finally {
    if (descriptor == null) {
      delete (Intl as { Segmenter?: unknown }).Segmenter;
    } else {
      Object.defineProperty(Intl, 'Segmenter', descriptor);
    }
  }
});

test('falls back when Intl.Segmenter.segment throws', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
  const value = '👩‍👩‍👧‍👦';

  class ThrowingSegmenter {
    public constructor(
      _locales?: Intl.LocalesArgument,
      _options?: Intl.SegmenterOptions
    ) {}

    public segment(_value: string): never {
      throw new Error('segment is unavailable');
    }
  }

  Object.defineProperty(Intl, 'Segmenter', {
    configurable: true,
    value: ThrowingSegmenter,
    writable: true,
  });

  try {
    expect(splitGraphemes(value)).toEqual(Array.from(value));
  } finally {
    if (descriptor == null) {
      delete (Intl as { Segmenter?: unknown }).Segmenter;
    } else {
      Object.defineProperty(Intl, 'Segmenter', descriptor);
    }
  }
});
