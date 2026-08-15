import type { StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';

export type NumberTrend = 'auto' | 'up' | 'down';

export type CubicBezierEasing = Readonly<{
  type: 'cubicBezier';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>;

export type SpringEasing = Readonly<{
  type: 'spring';
  damping: number;
  stiffness: number;
  mass?: number;
  initialVelocity?: number;
}>;

export type AnimationEasing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | CubicBezierEasing
  | SpringEasing;

export type AnimationTiming = Readonly<{
  duration?: number;
  easing?: AnimationEasing;
}>;

export type AnimatedNumberAnimation = Readonly<{
  digit?: AnimationTiming;
  layout?: AnimationTiming;
  opacity?: AnimationTiming;
}>;

export type NumberFormat =
  Intl.NumberFormatOptions | ((value: number) => Intl.NumberFormatOptions);

export type AnimatedNumberTextStyle = Pick<
  TextStyle,
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'fontStyle'
  | 'fontVariant'
  | 'fontWeight'
  | 'letterSpacing'
  | 'lineHeight'
  | 'textAlign'
  | 'writingDirection'
>;

export type AnimationEvent = Readonly<{
  formattedValue: string;
  value: number;
}>;

type IntlValueProps = Readonly<{
  value: number;
  locales?: Intl.LocalesArgument;
  format?: NumberFormat;
  prefix?: string;
  suffix?: string;
  initialValue?: number;
  formattedValue?: never;
  initialFormattedValue?: never;
}>;

type PreformattedWithoutInitial = Readonly<{
  value: number;
  formattedValue: string;
  initialValue?: never;
  initialFormattedValue?: never;
  locales?: never;
  format?: never;
  prefix?: never;
  suffix?: never;
}>;

type PreformattedWithInitial = Readonly<{
  value: number;
  formattedValue: string;
  initialValue: number;
  initialFormattedValue: string;
  locales?: never;
  format?: never;
  prefix?: never;
  suffix?: never;
}>;

type CommonProps = Omit<
  ViewProps,
  'accessibilityLabel' | 'children' | 'style'
> &
  Readonly<{
    accessibilityLabel?: string;
    allowFontScaling?: boolean;
    animated?: boolean;
    animation?: AnimatedNumberAnimation;
    containerStyle?: StyleProp<ViewStyle>;
    continuous?: boolean;
    mask?: boolean;
    maxFontSizeMultiplier?: number;
    onAnimationComplete?: (event: AnimationEvent) => void;
    onAnimationStart?: (event: AnimationEvent) => void;
    respectMotionPreference?: boolean;
    style?: StyleProp<AnimatedNumberTextStyle>;
    trend?: NumberTrend;
  }>;

export type AnimatedNumberProps = CommonProps &
  (IntlValueProps | PreformattedWithoutInitial | PreformattedWithInitial);
