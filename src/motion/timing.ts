import type {
  AnimatedNumberAnimation,
  AnimationEasing,
  AnimationTiming,
} from '../types';

export type ResolvedTiming = Readonly<{
  durationMs: number;
  easing: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  damping: number;
  stiffness: number;
  mass: number;
  initialVelocity: number;
}>;

export type ResolvedAnimation = Readonly<{
  digit: ResolvedTiming;
  layout: ResolvedTiming;
  opacity: ResolvedTiming;
}>;

const NAMED_CURVES = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0.22, 1, 0.36, 1],
  easeInOut: [0.65, 0, 0.35, 1],
} as const;

const DEFAULT_DIGIT: Required<AnimationTiming> = {
  duration: 800,
  easing: 'easeOut',
};

const DEFAULT_LAYOUT: Required<AnimationTiming> = {
  duration: 800,
  easing: 'easeOut',
};

const DEFAULT_OPACITY: Required<AnimationTiming> = {
  duration: 450,
  easing: 'easeOut',
};

const finiteOr = (value: number | undefined, fallback: number): number =>
  value == null || !Number.isFinite(value) ? fallback : value;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(value, maximum));

const clampDuration = (duration: number, fallback: number): number =>
  clamp(finiteOr(duration, fallback), 0, 60_000);

const resolveEasing = (
  easing: AnimationEasing
): Omit<ResolvedTiming, 'durationMs'> => {
  if (typeof easing === 'string') {
    const [x1, y1, x2, y2] = NAMED_CURVES[easing];
    return {
      damping: 1,
      easing: 'cubicBezier',
      initialVelocity: 0,
      mass: 1,
      stiffness: 100,
      x1,
      x2,
      y1,
      y2,
    };
  }

  if (easing.type === 'spring') {
    return {
      damping: Math.max(0.01, finiteOr(easing.damping, 1)),
      easing: 'spring',
      initialVelocity: finiteOr(easing.initialVelocity, 0),
      mass: Math.max(0.01, finiteOr(easing.mass, 1)),
      stiffness: Math.max(0.01, finiteOr(easing.stiffness, 100)),
      x1: 0,
      x2: 1,
      y1: 0,
      y2: 1,
    };
  }

  return {
    damping: 1,
    easing: 'cubicBezier',
    initialVelocity: 0,
    mass: 1,
    stiffness: 100,
    x1: clamp(finiteOr(easing.x1, 0), 0, 1),
    x2: clamp(finiteOr(easing.x2, 1), 0, 1),
    y1: finiteOr(easing.y1, 0),
    y2: finiteOr(easing.y2, 1),
  };
};

const resolveTiming = (
  timing: AnimationTiming | undefined,
  defaults: Required<AnimationTiming>
): ResolvedTiming => ({
  durationMs: clampDuration(
    timing?.duration ?? defaults.duration,
    defaults.duration
  ),
  ...resolveEasing(timing?.easing ?? defaults.easing),
});

export const resolveAnimation = (
  animation: AnimatedNumberAnimation | undefined
): ResolvedAnimation => ({
  digit: resolveTiming(animation?.digit, DEFAULT_DIGIT),
  layout: resolveTiming(animation?.layout, DEFAULT_LAYOUT),
  opacity: resolveTiming(animation?.opacity, DEFAULT_OPACITY),
});

export const getAnimationTimeout = (
  animation: ResolvedAnimation,
  reduceMotion: boolean
): number => {
  const duration = reduceMotion
    ? animation.opacity.durationMs
    : Math.max(
        animation.digit.durationMs,
        animation.layout.durationMs,
        animation.opacity.durationMs
      );
  return duration + 300;
};
