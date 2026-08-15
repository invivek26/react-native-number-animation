import { describe, expect, test } from 'bun:test';

import { createNumberPresentation } from '../format/presentation';
import { computeRollDelta, planTransition } from '../motion/plan-transition';

const present = (value: number) =>
  createNumberPresentation({ value, locales: 'en-US' });

const digitPlans = (plan: ReturnType<typeof planTransition>) =>
  plan.slots
    .filter(({ kind }) => kind === 'digit')
    .map(({ delta, digitValue, entering, key }) => ({
      delta,
      digitValue,
      entering,
      key,
    }));

describe('computeRollDelta', () => {
  test.each([
    [9, 0, 1, 1],
    [0, 9, -1, -1],
    [2, 8, 0, -4],
    [8, 2, 0, 4],
    [1, 6, 0, 5],
  ] as const)(
    'plans %i to %i with trend %i as delta %i',
    (previous, next, trend, expected) => {
      expect(computeRollDelta(previous, next, trend)).toBe(expected);
    }
  );
});

describe('planTransition', () => {
  test.each([
    [10, 11, 'auto', 1],
    [11, 10, 'auto', -1],
    [11, 10, 'up', 1],
    [10, 11, 'down', -1],
    [10, 10, 'auto', 0],
  ] as const)(
    'resolves %i to %i with %s trend as %i',
    (previous, next, trend, expected) => {
      expect(
        planTransition(present(previous), present(next), trend, false).trend
      ).toBe(expected);
    }
  );

  test('plans the new leading wheel and rollover for 9 to 10', () => {
    const plan = planTransition(present(9), present(10), 'auto', true);

    expect(digitPlans(plan)).toEqual([
      { delta: 1, digitValue: 1, entering: true, key: 'integer:1' },
      { delta: 1, digitValue: 0, entering: false, key: 'integer:0' },
    ]);
  });

  test('plans both existing rollovers and the new leading wheel for 99 to 100', () => {
    const plan = planTransition(present(99), present(100), 'auto', true);

    expect(digitPlans(plan)).toEqual([
      { delta: 1, digitValue: 1, entering: true, key: 'integer:2' },
      { delta: 1, digitValue: 0, entering: false, key: 'integer:1' },
      { delta: 1, digitValue: 0, entering: false, key: 'integer:0' },
    ]);
  });

  test('turns unchanged lower wheels for a continuous upward carry', () => {
    const plan = planTransition(present(190), present(200), 'auto', true);

    expect(digitPlans(plan).map(({ delta }) => delta)).toEqual([1, 1, 10]);
  });

  test('turns unchanged lower wheels for a continuous downward borrow', () => {
    const plan = planTransition(present(200), present(190), 'auto', true);

    expect(digitPlans(plan).map(({ delta }) => delta)).toEqual([-1, -1, -10]);
  });

  test('does not turn unchanged lower wheels when continuous mode is disabled', () => {
    const plan = planTransition(present(190), present(200), 'auto', false);

    expect(digitPlans(plan).map(({ delta }) => delta)).toEqual([1, 1, 0]);
  });

  test('turns unchanged fractional wheels below a changed digit', () => {
    const format: Intl.NumberFormatOptions = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
    const previous = createNumberPresentation({ value: 100.25, format });
    const next = createNumberPresentation({ value: 200.25, format });

    expect(
      digitPlans(planTransition(previous, next, 'auto', true)).map(
        ({ delta }) => delta
      )
    ).toEqual([1, 10, 10, 10, 10]);
  });

  test('keeps continuous carry isolated to each preformatted digit run', () => {
    const previous = createNumberPresentation({
      formattedValue: '10 / 50',
      value: 10,
    });
    const next = createNumberPresentation({
      formattedValue: '20 / 50',
      value: 20,
    });

    expect(
      digitPlans(planTransition(previous, next, 'auto', true)).map(
        ({ delta }) => delta
      )
    ).toEqual([1, 10, 0, 0]);
  });

  test('does not animate slots when values have the same formatted output', () => {
    const format: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
    const previous = createNumberPresentation({ value: 1.1, format });
    const next = createNumberPresentation({ value: 1.2, format });
    const plan = planTransition(previous, next, 'auto', true);

    expect(previous.formattedValue).toBe(next.formattedValue);
    expect(plan.trend).toBe(1);
    expect(
      plan.slots.every(({ delta, entering }) => delta === 0 && !entering)
    ).toBe(true);
  });

  test.each([
    [Number.NaN, 1],
    [1, Number.NaN],
    [Number.POSITIVE_INFINITY, 1],
    [1, Number.NEGATIVE_INFINITY],
  ])(
    'uses a neutral automatic trend for non-finite transition %p to %p',
    (from, to) => {
      const plan = planTransition(present(from), present(to), 'auto', true);

      expect(plan.trend).toBe(0);
    }
  );

  test('uses shortest-path digit deltas when a non-finite value makes trend neutral', () => {
    const previous = createNumberPresentation({
      value: Number.NaN,
      formattedValue: '9',
    });
    const next = createNumberPresentation({ value: 1, formattedValue: '1' });

    expect(digitPlans(planTransition(previous, next, 'auto', true))).toEqual([
      { delta: 2, digitValue: 1, entering: false, key: 'run:1:0' },
    ]);
  });
});
