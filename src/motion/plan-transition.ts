import type {
  NumberPresentation,
  NumberSlot,
  PlannedSlot,
  TransitionPlan,
} from '../internal-types';
import type { NumberTrend } from '../types';

export const computeRollDelta = (
  previousDigit: number,
  nextDigit: number,
  trend: -1 | 0 | 1,
  wheelSize = 10
): number => {
  const rawDelta = nextDigit - previousDigit;

  if (trend > 0) {
    return rawDelta >= 0 ? rawDelta : wheelSize + rawDelta;
  }

  if (trend < 0) {
    return rawDelta <= 0 ? rawDelta : rawDelta - wheelSize;
  }

  if (Math.abs(rawDelta) <= wheelSize / 2) {
    return rawDelta;
  }

  return rawDelta > 0 ? rawDelta - wheelSize : wheelSize + rawDelta;
};

const resolveTrend = (
  previousValue: number,
  nextValue: number,
  trend: NumberTrend
): -1 | 0 | 1 => {
  if (trend === 'up') {
    return 1;
  }

  if (trend === 'down') {
    return -1;
  }

  if (!Number.isFinite(previousValue) || !Number.isFinite(nextValue)) {
    return 0;
  }

  return Math.sign(nextValue - previousValue) as -1 | 0 | 1;
};

type DigitPosition = Readonly<{
  domain: string;
  rank: number;
}>;

const getDigitPosition = (slot: NumberSlot): DigitPosition | undefined => {
  const [type, firstPosition, secondPosition] = slot.key.split(':');

  if (type === 'integer' && firstPosition != null) {
    return { domain: 'number', rank: Number(firstPosition) };
  }

  if (type === 'fraction' && firstPosition != null) {
    return { domain: 'number', rank: -Number(firstPosition) - 1 };
  }

  if (type === 'exponentInteger' && firstPosition != null) {
    return { domain: 'exponent', rank: Number(firstPosition) };
  }

  if (type === 'run' && firstPosition != null && secondPosition != null) {
    return { domain: `run:${firstPosition}`, rank: Number(secondPosition) };
  }

  return undefined;
};

const getHighestChangedPosition = (
  previousByKey: ReadonlyMap<string, NumberSlot>,
  slots: readonly NumberSlot[]
): ReadonlyMap<string, number> => {
  const highestByDomain = new Map<string, number>();

  slots.forEach((slot) => {
    const previous = previousByKey.get(slot.key);
    const position = getDigitPosition(slot);
    if (
      previous?.kind !== 'digit' ||
      slot.kind !== 'digit' ||
      previous.digitValue === slot.digitValue ||
      position == null
    ) {
      return;
    }

    highestByDomain.set(
      position.domain,
      Math.max(highestByDomain.get(position.domain) ?? -Infinity, position.rank)
    );
  });

  return highestByDomain;
};

export const planTransition = (
  previous: NumberPresentation,
  next: NumberPresentation,
  trendProp: NumberTrend,
  continuous: boolean
): TransitionPlan => {
  const previousByKey = new Map(previous.slots.map((slot) => [slot.key, slot]));
  const trend = resolveTrend(previous.value, next.value, trendProp);
  const highestChangedByDomain = continuous
    ? getHighestChangedPosition(previousByKey, next.slots)
    : new Map<string, number>();

  const slots: PlannedSlot[] = next.slots.map((slot) => {
    const previousSlot = previousByKey.get(slot.key);
    const entering = previousSlot == null;
    let delta = 0;

    if (slot.kind === 'digit') {
      const previousDigit =
        previousSlot?.kind === 'digit' ? previousSlot.digitValue : 0;
      delta = computeRollDelta(previousDigit, slot.digitValue, trend);

      const position = getDigitPosition(slot);
      if (
        continuous &&
        trend !== 0 &&
        previousSlot?.kind === 'digit' &&
        previousDigit === slot.digitValue &&
        position != null &&
        position.rank <
          (highestChangedByDomain.get(position.domain) ??
            Number.NEGATIVE_INFINITY)
      ) {
        delta = 10 * trend;
      }
    }

    return { ...slot, delta, entering };
  });

  return {
    previousSlots: previous.slots,
    slots,
    trend,
  };
};
