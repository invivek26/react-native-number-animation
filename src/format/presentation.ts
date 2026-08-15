import type { NumberFormat } from '../types';
import type { NumberPresentation, NumberSlot } from '../internal-types';
import { getNumberFormatter } from './formatter-cache';
import { splitGraphemes } from './graphemes';

type PresentationInput = Readonly<{
  value: number;
  locales?: Intl.LocalesArgument;
  format?: NumberFormat;
  formattedValue?: string;
  prefix?: string;
  suffix?: string;
}>;

const getDigitGlyphs = (
  locales: Intl.LocalesArgument | undefined,
  options: Intl.NumberFormatOptions
): readonly string[] => {
  const digitFormatter = getNumberFormatter(locales, {
    numberingSystem: options.numberingSystem,
    useGrouping: false,
    maximumFractionDigits: 0,
  });

  return Array.from({ length: 10 }, (_, digit) => {
    const graphemes = splitGraphemes(digitFormatter.format(digit));
    return graphemes[graphemes.length - 1] ?? String(digit);
  });
};

const DECIMAL_ZERO_CODE_POINTS = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66,
  0xce6, 0xd66, 0xde6, 0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810,
  0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620,
  0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10, 0x104a0, 0x10d30,
  0x11066, 0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0, 0x11650,
  0x116c0, 0x11730, 0x118e0, 0x11950, 0x11c50, 0x11d50, 0x11da0, 0x11f50,
  0x16a60, 0x16ac0, 0x16b50, 0x1d7ce, 0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6,
] as const;

const toUnicodeDigitValue = (grapheme: string): number => {
  if (!/^\p{Nd}$/u.test(grapheme)) {
    return -1;
  }

  const codePoint = grapheme.codePointAt(0);
  if (codePoint == null) {
    return -1;
  }

  const zero = DECIMAL_ZERO_CODE_POINTS.find(
    (candidate) => codePoint >= candidate && codePoint <= candidate + 9
  );
  return zero == null ? -1 : codePoint - zero;
};

const getPreformattedDigitGlyphs = (
  formattedValue: string,
  fallback: readonly string[]
): readonly string[] => {
  const firstDigit = splitGraphemes(formattedValue).find((grapheme) =>
    /^\p{Nd}$/u.test(grapheme)
  );
  const codePoint = firstDigit?.codePointAt(0);
  if (codePoint == null) {
    return fallback;
  }

  const zero = DECIMAL_ZERO_CODE_POINTS.find(
    (candidate) => codePoint >= candidate && codePoint <= candidate + 9
  );
  if (zero == null) {
    return fallback;
  }

  return Array.from({ length: 10 }, (_, digit) =>
    String.fromCodePoint(zero + digit)
  );
};

const toDigitValue = (
  grapheme: string,
  digitGlyphs: readonly string[]
): number => {
  const localizedValue = digitGlyphs.indexOf(grapheme);
  return localizedValue >= 0 ? localizedValue : toUnicodeDigitValue(grapheme);
};

type PartGrapheme = Readonly<{
  partType: Intl.NumberFormatPart['type'];
  text: string;
}>;

type FormatterWithOptionalParts = Pick<Intl.NumberFormat, 'format'> &
  Partial<Pick<Intl.NumberFormat, 'formatToParts'>>;

const isLocalizedDigit = (
  grapheme: string,
  digitGlyphs: readonly string[]
): boolean => digitGlyphs.includes(grapheme) || /^\p{Nd}$/u.test(grapheme);

const getDigitRunStart = (
  graphemes: readonly string[],
  digitGlyphs: readonly string[]
): number | undefined => {
  for (let index = graphemes.length - 1; index >= 0; index -= 1) {
    if (!isLocalizedDigit(graphemes[index] ?? '', digitGlyphs)) {
      continue;
    }

    let start = index;
    while (
      start > 0 &&
      isLocalizedDigit(graphemes[start - 1] ?? '', digitGlyphs)
    ) {
      start -= 1;
    }
    return start;
  }

  return undefined;
};

const getLastSeparatorBetweenDigits = (
  graphemes: readonly string[],
  digitGlyphs: readonly string[],
  lastIndex = graphemes.length - 2
): string | undefined => {
  for (let index = lastIndex; index > 0; index -= 1) {
    const before = graphemes[index - 1] ?? '';
    const current = graphemes[index] ?? '';
    const after = graphemes[index + 1] ?? '';
    if (
      !isLocalizedDigit(current, digitGlyphs) &&
      isLocalizedDigit(before, digitGlyphs) &&
      isLocalizedDigit(after, digitGlyphs)
    ) {
      return current;
    }
  }

  return undefined;
};

const getDecimalSeparator = (
  formatter: Pick<Intl.NumberFormat, 'format'>,
  digitGlyphs: readonly string[],
  notation: Intl.NumberFormatOptions['notation'] | undefined
): string | undefined => {
  const probes = [1.1, 1.234_567, 0.123_456_7];

  for (const probe of probes) {
    const graphemes = splitGraphemes(formatter.format(probe));
    const exponentStart =
      notation === 'engineering' || notation === 'scientific'
        ? getDigitRunStart(graphemes, digitGlyphs)
        : undefined;
    const separator = getLastSeparatorBetweenDigits(
      graphemes,
      digitGlyphs,
      exponentStart == null ? undefined : exponentStart - 2
    );

    if (separator != null) {
      return separator;
    }
  }

  return undefined;
};

const createFallbackParts = (
  formatter: Pick<Intl.NumberFormat, 'format'>,
  value: number,
  digitGlyphs: readonly string[],
  notation: Intl.NumberFormatOptions['notation'] | undefined
): Intl.NumberFormatPart[] => {
  const graphemes = splitGraphemes(formatter.format(value));
  const decimalSeparator = getDecimalSeparator(
    formatter,
    digitGlyphs,
    notation
  );
  const exponentStart =
    notation === 'engineering' || notation === 'scientific'
      ? getDigitRunStart(graphemes, digitGlyphs)
      : undefined;
  let decimalIndex = -1;
  for (let index = graphemes.length - 2; index > 0; index -= 1) {
    if (
      graphemes[index] === decimalSeparator &&
      isLocalizedDigit(graphemes[index - 1] ?? '', digitGlyphs) &&
      isLocalizedDigit(graphemes[index + 1] ?? '', digitGlyphs)
    ) {
      decimalIndex = index;
      break;
    }
  }

  return graphemes.map((text, index) => {
    if (isLocalizedDigit(text, digitGlyphs)) {
      const type =
        exponentStart != null && index >= exponentStart
          ? 'exponentInteger'
          : decimalIndex >= 0 && index > decimalIndex
            ? 'fraction'
            : 'integer';
      return { type, value: text };
    }

    return {
      type: index === decimalIndex ? 'decimal' : 'literal',
      value: text,
    };
  });
};

const getNumberFormatParts = (
  formatter: FormatterWithOptionalParts,
  value: number,
  digitGlyphs: readonly string[],
  notation: Intl.NumberFormatOptions['notation'] | undefined
): Intl.NumberFormatPart[] => {
  if (typeof formatter.formatToParts === 'function') {
    return formatter.formatToParts(value);
  }

  return createFallbackParts(formatter, value, digitGlyphs, notation);
};

const POSITIONAL_PART_TYPES = new Set<Intl.NumberFormatPart['type']>([
  'integer',
  'fraction',
  'exponentInteger',
]);

const createIntlSlots = (
  formatter: FormatterWithOptionalParts,
  value: number,
  digitGlyphs: readonly string[],
  prefix: string,
  suffix: string,
  notation: Intl.NumberFormatOptions['notation'] | undefined
): NumberSlot[] => {
  const parts = getNumberFormatParts(formatter, value, digitGlyphs, notation);
  const slots: NumberSlot[] = [];

  splitGraphemes(prefix).forEach((text, index) => {
    slots.push({
      digitValue: -1,
      key: `prefix:${index}`,
      kind: 'symbol',
      text,
    });
  });

  const graphemes: PartGrapheme[] = parts.flatMap((part) =>
    splitGraphemes(part.value).map((text) => ({ partType: part.type, text }))
  );
  const ordinalByIndex = new Map<number, number>();
  const partTypes = new Set(graphemes.map(({ partType }) => partType));

  partTypes.forEach((partType) => {
    const indices = graphemes.flatMap((grapheme, index) =>
      grapheme.partType === partType ? [index] : []
    );
    const orderedIndices =
      partType === 'integer' ||
      partType === 'group' ||
      partType === 'exponentInteger'
        ? [...indices].reverse()
        : indices;
    orderedIndices.forEach((index, ordinal) => {
      ordinalByIndex.set(index, ordinal);
    });
  });

  graphemes.forEach(({ partType, text }, index) => {
    const digitValue = toDigitValue(text, digitGlyphs);
    const ordinal = ordinalByIndex.get(index) ?? index;
    const isDigit = digitValue >= 0 && POSITIONAL_PART_TYPES.has(partType);
    slots.push({
      digitValue: isDigit ? digitValue : -1,
      key: `${partType}:${ordinal}`,
      kind: isDigit ? 'digit' : 'symbol',
      text,
    });
  });

  splitGraphemes(suffix).forEach((text, index) => {
    slots.push({
      digitValue: -1,
      key: `suffix:${index}`,
      kind: 'symbol',
      text,
    });
  });

  return slots;
};

const createPreformattedSlots = (
  formattedValue: string,
  digitGlyphs: readonly string[]
): NumberSlot[] => {
  const graphemes = splitGraphemes(formattedValue);
  const runPositions = new Map<number, number>();
  let run = 0;
  let inDigitRun = false;

  graphemes.forEach((text, index) => {
    const isDigit =
      toDigitValue(text, digitGlyphs) >= 0 || /^\p{Nd}$/u.test(text);
    if (isDigit && !inDigitRun) {
      run += 1;
    }
    inDigitRun = isDigit;
    if (isDigit) {
      runPositions.set(index, run);
    }
  });

  return graphemes.map((text, index) => {
    const digitValue = toDigitValue(text, digitGlyphs);
    const runIndex = runPositions.get(index);

    if (runIndex == null || digitValue < 0) {
      return {
        digitValue: -1,
        key: `literal:${index}`,
        kind: 'symbol',
        text,
      };
    }

    let digitsToRight = 0;
    for (let cursor = index + 1; cursor < graphemes.length; cursor += 1) {
      if (runPositions.get(cursor) === runIndex) {
        digitsToRight += 1;
      }
    }

    return {
      digitValue,
      key: `run:${runIndex}:${digitsToRight}`,
      kind: 'digit',
      text,
    };
  });
};

export const createNumberPresentation = ({
  value,
  locales,
  format,
  formattedValue,
  prefix = '',
  suffix = '',
}: PresentationInput): NumberPresentation => {
  const options = typeof format === 'function' ? format(value) : (format ?? {});
  const formatter = getNumberFormatter(locales, options);
  const formatterDigitGlyphs = getDigitGlyphs(locales, options);
  const digitGlyphs =
    formattedValue == null
      ? formatterDigitGlyphs
      : getPreformattedDigitGlyphs(formattedValue, formatterDigitGlyphs);
  const resolvedText =
    formattedValue ?? `${prefix}${formatter.format(value)}${suffix}`;
  const slots =
    formattedValue == null
      ? createIntlSlots(
          formatter,
          value,
          digitGlyphs,
          prefix,
          suffix,
          options.notation
        )
      : createPreformattedSlots(formattedValue, digitGlyphs);

  return {
    digitGlyphs,
    formattedValue: resolvedText,
    slots,
    value,
  };
};
