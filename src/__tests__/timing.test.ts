import { describe, expect, test } from 'bun:test';
import { getAnimationTimeout, resolveAnimation } from '../motion/timing';

describe('resolveAnimation', () => {
  test('uses the production default timings', () => {
    const animation = resolveAnimation(undefined);

    expect(animation.digit.durationMs).toBe(800);
    expect(animation.layout.durationMs).toBe(800);
    expect(animation.opacity.durationMs).toBe(450);
    expect(animation.digit.easing).toBe('cubicBezier');
  });

  test('serializes spring parameters for native renderers', () => {
    const animation = resolveAnimation({
      digit: {
        duration: 600,
        easing: {
          damping: 14,
          initialVelocity: 2,
          mass: 0.8,
          stiffness: 180,
          type: 'spring',
        },
      },
    });

    expect(animation.digit).toMatchObject({
      damping: 14,
      durationMs: 600,
      easing: 'spring',
      initialVelocity: 2,
      mass: 0.8,
      stiffness: 180,
    });
  });

  test('clamps invalid timing ranges safely', () => {
    const animation = resolveAnimation({
      digit: {
        duration: -1,
        easing: {
          damping: 0,
          mass: 0,
          stiffness: 0,
          type: 'spring',
        },
      },
      opacity: { duration: 100_000 },
    });

    expect(animation.digit.durationMs).toBe(0);
    expect(animation.digit.damping).toBe(0.01);
    expect(animation.digit.mass).toBe(0.01);
    expect(animation.digit.stiffness).toBe(0.01);
    expect(animation.opacity.durationMs).toBe(60_000);
  });

  test('replaces non-finite timing values and clamps bezier x coordinates', () => {
    const animation = resolveAnimation({
      digit: {
        duration: Number.NaN,
        easing: {
          type: 'cubicBezier',
          x1: -2,
          y1: Number.NaN,
          x2: 3,
          y2: Number.POSITIVE_INFINITY,
        },
      },
    });

    expect(animation.digit).toMatchObject({
      durationMs: 800,
      x1: 0,
      x2: 1,
      y1: 0,
      y2: 1,
    });
  });

  test('uses opacity duration for the reduced-motion fallback', () => {
    const animation = resolveAnimation(undefined);

    expect(getAnimationTimeout(animation, false)).toBe(1_100);
    expect(getAnimationTimeout(animation, true)).toBe(750);
  });
});
