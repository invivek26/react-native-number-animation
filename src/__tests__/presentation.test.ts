import { describe, expect, test } from 'bun:test';

import { createNumberPresentation } from '../format/presentation';

const slotSummary = (value: ReturnType<typeof createNumberPresentation>) =>
  value.slots.map(({ digitValue, key, kind, text }) => ({
    digitValue,
    key,
    kind,
    text,
  }));

describe('createNumberPresentation', () => {
  test('gives every grouped integer digit a unique place-value key', () => {
    const presentation = createNumberPresentation({
      value: 1_234_567,
      locales: 'en-US',
    });

    expect(presentation.formattedValue).toBe('1,234,567');
    expect(
      presentation.slots
        .filter(({ kind }) => kind === 'digit')
        .map(({ key }) => key)
    ).toEqual([
      'integer:6',
      'integer:5',
      'integer:4',
      'integer:3',
      'integer:2',
      'integer:1',
      'integer:0',
    ]);
    expect(
      presentation.slots
        .filter(({ kind }) => kind === 'digit')
        .map(({ key }) => key)
    ).toEqual([
      ...new Set(
        presentation.slots
          .filter(({ kind }) => kind === 'digit')
          .map(({ key }) => key)
      ),
    ]);
  });

  test('keys fraction digits from left to right independently of integer places', () => {
    const presentation = createNumberPresentation({
      value: 1_234.5,
      locales: 'en-US',
      format: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    });

    expect(presentation.formattedValue).toBe('1,234.50');
    expect(
      presentation.slots
        .filter(({ kind }) => kind === 'digit')
        .map(({ key, text }) => [key, text])
    ).toEqual([
      ['integer:3', '1'],
      ['integer:2', '2'],
      ['integer:1', '3'],
      ['integer:0', '4'],
      ['fraction:0', '5'],
      ['fraction:1', '0'],
    ]);
  });

  test('maps localized Arabic glyphs to decimal digit values', () => {
    const presentation = createNumberPresentation({
      value: 1_234.5,
      locales: 'ar-EG',
      format: {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      },
    });

    expect(presentation.formattedValue).toContain('١');
    expect(
      presentation.slots
        .filter(({ kind }) => kind === 'digit')
        .map(({ digitValue }) => digitValue)
    ).toEqual([1, 2, 3, 4, 5]);
    expect(presentation.slots.every(({ text }) => text !== '؜')).toBe(true);
  });

  test('retains bidi controls as symbol slots for Arabic negative currency', () => {
    const presentation = createNumberPresentation({
      value: -1_234.5,
      locales: 'ar-EG',
      format: {
        currency: 'USD',
        style: 'currency',
      },
    });
    const bidiControlSlots = presentation.slots.filter(({ text }) =>
      /^[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]$/u.test(text)
    );

    expect(bidiControlSlots.length).toBeGreaterThan(0);
    expect(
      bidiControlSlots.every(
        ({ digitValue, kind }) => digitValue === -1 && kind === 'symbol'
      )
    ).toBe(true);
  });

  test('formats and keys slots when the formatter lacks formatToParts', () => {
    const originalNumberFormat = Intl.NumberFormat;

    class NumberFormatWithoutParts {
      public constructor(
        _locales: Intl.LocalesArgument | undefined,
        private readonly options: Intl.NumberFormatOptions = {}
      ) {}

      public format = (value: number): string => {
        if (
          this.options.useGrouping === false &&
          this.options.maximumFractionDigits === 0
        ) {
          return String(value);
        }

        return `$${value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USD`;
      };
    }

    Object.defineProperty(Intl, 'NumberFormat', {
      configurable: true,
      value: NumberFormatWithoutParts,
      writable: true,
    });

    try {
      const presentation = createNumberPresentation({
        value: 1_234.5,
        locales: 'en-US-x-no-format-to-parts',
        format: {
          currency: 'USD',
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
          style: 'currency',
        },
      });

      expect(presentation.formattedValue).toBe('$1,234.50 USD');
      expect(
        presentation.slots
          .filter(({ kind }) => kind === 'digit')
          .map(({ digitValue, key }) => [key, digitValue])
      ).toEqual([
        ['integer:3', 1],
        ['integer:2', 2],
        ['integer:1', 3],
        ['integer:0', 4],
        ['fraction:0', 5],
        ['fraction:1', 0],
      ]);
    } finally {
      Object.defineProperty(Intl, 'NumberFormat', {
        configurable: true,
        value: originalNumberFormat,
        writable: true,
      });
    }
  });

  test('keeps mantissa and exponent slots independent without formatToParts', () => {
    const originalNumberFormat = Intl.NumberFormat;

    class NumberFormatWithoutParts {
      public constructor(
        _locales: Intl.LocalesArgument | undefined,
        private readonly options: Intl.NumberFormatOptions = {}
      ) {}

      public format = (value: number): string => {
        if (
          this.options.useGrouping === false &&
          this.options.maximumFractionDigits === 0
        ) {
          return String(value);
        }

        return '1.23E3';
      };
    }

    Object.defineProperty(Intl, 'NumberFormat', {
      configurable: true,
      value: NumberFormatWithoutParts,
      writable: true,
    });

    try {
      const presentation = createNumberPresentation({
        value: 1_230,
        locales: 'en-US-x-no-format-to-parts-scientific',
        format: { notation: 'scientific' },
      });

      expect(presentation.formattedValue).toBe('1.23E3');
      expect(
        presentation.slots
          .filter(({ kind }) => kind === 'digit')
          .map(({ digitValue, key }) => [key, digitValue])
      ).toEqual([
        ['integer:0', 1],
        ['fraction:0', 2],
        ['fraction:1', 3],
        ['exponentInteger:0', 3],
      ]);
    } finally {
      Object.defineProperty(Intl, 'NumberFormat', {
        configurable: true,
        value: originalNumberFormat,
        writable: true,
      });
    }
  });

  test('preserves fractional place keys for significant-digit formats without formatToParts', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Intl.NumberFormat.prototype,
      'formatToParts'
    );

    Object.defineProperty(Intl.NumberFormat.prototype, 'formatToParts', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const presentation = createNumberPresentation({
        value: 1.2345,
        locales: 'en-US-x-sigpart',
        format: { maximumSignificantDigits: 3 },
      });

      expect(presentation.formattedValue).toBe('1.23');
      expect(
        presentation.slots
          .filter(({ kind }) => kind === 'digit')
          .map(({ digitValue, key }) => [key, digitValue])
      ).toEqual([
        ['integer:0', 1],
        ['fraction:0', 2],
        ['fraction:1', 3],
      ]);
    } finally {
      if (descriptor == null) {
        delete (Intl.NumberFormat.prototype as { formatToParts?: unknown })
          .formatToParts;
      } else {
        Object.defineProperty(
          Intl.NumberFormat.prototype,
          'formatToParts',
          descriptor
        );
      }
    }
  });

  test('keeps prefixes and suffixes as stable symbol slots', () => {
    const presentation = createNumberPresentation({
      value: 42,
      locales: 'en-US',
      prefix: '$',
      suffix: ' kg',
    });

    expect(slotSummary(presentation)).toEqual([
      { digitValue: -1, key: 'prefix:0', kind: 'symbol', text: '$' },
      { digitValue: 4, key: 'integer:1', kind: 'digit', text: '4' },
      { digitValue: 2, key: 'integer:0', kind: 'digit', text: '2' },
      { digitValue: -1, key: 'suffix:0', kind: 'symbol', text: ' ' },
      { digitValue: -1, key: 'suffix:1', kind: 'symbol', text: 'k' },
      { digitValue: -1, key: 'suffix:2', kind: 'symbol', text: 'g' },
    ]);
  });

  test('keys each preformatted digit run by its own right-relative position', () => {
    const presentation = createNumberPresentation({
      value: 0,
      formattedValue: 'Q12 / 345 kg',
    });

    expect(
      presentation.slots
        .filter(({ kind }) => kind === 'digit')
        .map(({ digitValue, key }) => [key, digitValue])
    ).toEqual([
      ['run:1:1', 1],
      ['run:1:0', 2],
      ['run:2:2', 3],
      ['run:2:1', 4],
      ['run:2:0', 5],
    ]);
  });

  test('recognizes Unicode decimal digits in preformatted runs', () => {
    const presentation = createNumberPresentation({
      value: 12,
      formattedValue: '١٢',
    });

    expect(slotSummary(presentation)).toEqual([
      { digitValue: 1, key: 'run:1:1', kind: 'digit', text: '١' },
      { digitValue: 2, key: 'run:1:0', kind: 'digit', text: '٢' },
    ]);
    expect(presentation.digitGlyphs).toEqual([
      '٠',
      '١',
      '٢',
      '٣',
      '٤',
      '٥',
      '٦',
      '٧',
      '٨',
      '٩',
    ]);
  });

  test.each([
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, '∞'],
    [Number.NEGATIVE_INFINITY, '-∞'],
  ])('represents non-finite value %p without digit slots', (value, text) => {
    const presentation = createNumberPresentation({
      value,
      locales: 'en-US',
    });

    expect(presentation.formattedValue).toBe(text);
    expect(presentation.slots.every(({ kind }) => kind === 'symbol')).toBe(
      true
    );
  });
});
