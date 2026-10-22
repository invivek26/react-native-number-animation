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

  const types = graphemes.map((text, index): Intl.NumberFormatPart['type'] => {
    if (!isLocalizedDigit(text, digitGlyphs)) {
      return index === decimalIndex ? 'decimal' : 'literal';
    }

    if (exponentStart != null && index >= exponentStart) {
      return 'exponentInteger';
    }

    return decimalIndex >= 0 && index > decimalIndex ? 'fraction' : 'integer';
  });

  return graphemes.map((text, index) => ({
    type:
      types[index] === 'literal' &&
      types[index - 1] === 'integer' &&
      types[index + 1] === 'integer'
        ? 'group'
        : (types[index] ?? 'literal'),
    value: text,
  }));
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

const NUMBER_SEPARATORS = new Set([
  ',',
  '.',
  ' ',
  '\u00a0',
  '\u2009',
  '\u202f',
  "'",
  '\u2019',
  '\u066b',
  '\u066c',
]);

const GROUP_ONLY_SEPARATORS = new Set([
  ' ',
  '\u00a0',
  '\u2009',
  '\u202f',
  "'",
  '\u2019',
  '\u066c',
]);

const SIGN_PART_TYPES = new Map([
  ['-', 'minusSign'],
  ['\u2212', 'minusSign'],
  ['+', 'plusSign'],
]);

// ponytail: no locale here, so a lone "," before exactly three digits is read as
// grouping ("1,000") and a lone "." as a decimal ("1.000" in de-DE reads as 1.0).
const findDecimalIndex = (
  graphemes: readonly string[],
  separators: readonly number[],
  end: number
): number => {
  const last = separators[separators.length - 1];
  const text = last == null ? undefined : graphemes[last];
  if (last == null || text == null || GROUP_ONLY_SEPARATORS.has(text)) {
    return -1;
  }

  const occurrences = separators.filter(
    (index) => graphemes[index] === text
  ).length;
  if (occurrences > 1) {
    return -1;
  }

  const isThousandsComma =
    separators.length === 1 && text === ',' && end - last === 3;
  return isThousandsComma ? -1 : last;
};

type PreformattedLayout = Readonly<{
  start: number;
  end: number;
  decimalIndex: number;
  signIndex: number;
  integerPlaces: ReadonlyMap<number, number>;
  groupOrdinals: ReadonlyMap<number, number>;
}>;

const getPreformattedKey = (
  text: string,
  index: number,
  layout: PreformattedLayout
): string => {
  const { start, end, decimalIndex, signIndex } = layout;
  if (index === signIndex) {
    return `${SIGN_PART_TYPES.get(text)}:0`;
  }

  if (index < start) {
    return `prefix:${signIndex >= 0 && index > signIndex ? index - 1 : index}`;
  }

  if (index > end) {
    return `suffix:${index - end - 1}`;
  }

  if (index === decimalIndex) {
    return 'decimal:0';
  }

  const groupOrdinal = layout.groupOrdinals.get(index);
  if (groupOrdinal != null) {
    return `group:${groupOrdinal}`;
  }

  if (decimalIndex >= 0 && index > decimalIndex) {
    return `fraction:${index - decimalIndex - 1}`;
  }

  return `integer:${layout.integerPlaces.get(index)}`;
};

const toOrdinalsFromRight = (
  indices: readonly number[]
): ReadonlyMap<number, number> =>
  new Map(
    indices.map((index, ordinal) => [index, indices.length - 1 - ordinal])
  );

const createPreformattedSlots = (
  formattedValue: string,
  digitGlyphs: readonly string[]
): NumberSlot[] => {
  const graphemes = splitGraphemes(formattedValue);
  const digitValues = graphemes.map((text) => toDigitValue(text, digitGlyphs));
  const isDigitAt = (index: number) => (digitValues[index] ?? -1) >= 0;
  const start = digitValues.findIndex((digitValue) => digitValue >= 0);

  if (start < 0) {
    return graphemes.map((text, index) => ({
      digitValue: -1,
      key: `literal:${index}`,
      kind: 'symbol',
      text,
    }));
  }

  // The number is the first run of digits joined by single separators.
  let end = start;
  for (let index = start + 1; index < graphemes.length; index += 1) {
    if (isDigitAt(index)) {
      end = index;
      continue;
    }
    if (
      !NUMBER_SEPARATORS.has(graphemes[index] ?? '') ||
      !isDigitAt(index + 1)
    ) {
      break;
    }
  }

  const spanIndices = Array.from(
    { length: end - start + 1 },
    (_, offset) => start + offset
  );
  const separators = spanIndices.filter((index) => !isDigitAt(index));
  const decimalIndex = findDecimalIndex(graphemes, separators, end);
  const integerEnd = decimalIndex < 0 ? end : decimalIndex - 1;
  let signIndex = -1;
  graphemes.slice(0, start).forEach((text, index) => {
    if (SIGN_PART_TYPES.has(text)) {
      signIndex = index;
    }
  });

  const layout: PreformattedLayout = {
    start,
    end,
    decimalIndex,
    signIndex,
    integerPlaces: toOrdinalsFromRight(
      spanIndices.filter((index) => index <= integerEnd && isDigitAt(index))
    ),
    groupOrdinals: toOrdinalsFromRight(
      separators.filter((index) => index !== decimalIndex)
    ),
  };

  return graphemes.map((text, index) => {
    const isNumberDigit = index >= start && index <= end && isDigitAt(index);
    return {
      digitValue: isNumberDigit ? (digitValues[index] ?? -1) : -1,
      key: getPreformattedKey(text, index, layout),
      kind: isNumberDigit ? 'digit' : 'symbol',
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
