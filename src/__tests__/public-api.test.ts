import { expect, test } from 'bun:test';
import type {
  AnimationEasing,
  CubicBezierEasing,
  SpringEasing,
} from '../index';
import type { AnimatedNumberProps } from '../types';

const cubicBezier: CubicBezierEasing = {
  type: 'cubicBezier',
  x1: 0.2,
  y1: 0,
  x2: 0.8,
  y2: 1,
};
const spring: SpringEasing = {
  type: 'spring',
  damping: 18,
  stiffness: 160,
};
const easings: readonly AnimationEasing[] = [cubicBezier, spring, 'linear'];

const intlProps = {
  format: { currency: 'USD', style: 'currency' },
  value: 1_234.5,
} satisfies AnimatedNumberProps;

const preformattedProps = {
  formattedValue: 'Level 42',
  value: 42,
} satisfies AnimatedNumberProps;

const preformattedInitialProps = {
  formattedValue: 'Level 42',
  initialFormattedValue: 'Level 0',
  initialValue: 0,
  value: 42,
} satisfies AnimatedNumberProps;

// @ts-expect-error Preformatted mode cannot also use Intl options.
const mixedFormattingProps: AnimatedNumberProps = {
  format: {},
  formattedValue: '42',
  value: 42,
};

// @ts-expect-error Preformatted initial animations need both initial values.
const incompleteInitialProps: AnimatedNumberProps = {
  formattedValue: '42',
  initialValue: 0,
  value: 42,
};

const invalidStyleProps: AnimatedNumberProps = {
  // @ts-expect-error Layout belongs on containerStyle, not text style.
  style: { margin: 4 },
  value: 42,
};

const invalidValueProps: AnimatedNumberProps = {
  // @ts-expect-error The animated value is always numeric.
  value: '42',
};

test('accepts each public formatting mode', () => {
  expect(intlProps.value).toBe(1_234.5);
  expect(preformattedProps.formattedValue).toBe('Level 42');
  expect(preformattedInitialProps.initialValue).toBe(0);
  expect(mixedFormattingProps.formattedValue).toBe('42');
  expect(incompleteInitialProps.initialValue).toBe(0);
  expect(invalidStyleProps.value).toBe(42);
  expect(typeof invalidValueProps.value).toBe('string');
  expect(easings).toHaveLength(3);
});
