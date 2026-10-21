import type { AnimatedNumberTextStyle } from './types';

export const resolveNativeFontWeight = (
  fontWeight: AnimatedNumberTextStyle['fontWeight']
): string | undefined => (fontWeight == null ? undefined : String(fontWeight));

type NativeFontMetricsInput = Readonly<{
  platform: string;
  fontScale: number;
  allowFontScaling: boolean;
  maxFontSizeMultiplier: number | undefined;
  fontSize: number | undefined;
  lineHeight: number | undefined;
  letterSpacing: number | undefined;
}>;

export type NativeFontMetrics = Readonly<{
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  allowFontScaling: boolean;
  maxFontSizeMultiplier: number;
  fontScale: number;
}>;

// Android scales these natively as SP, like React Native's own Text, so its
// nonlinear font scaling (Android 14+) matches the hidden sizing Text. fontScale
// only tells the native view to re-resolve them when the system scale changes.
export const resolveNativeFontMetrics = ({
  platform,
  fontScale,
  allowFontScaling,
  maxFontSizeMultiplier,
  fontSize = 14,
  lineHeight,
  letterSpacing = 0,
}: NativeFontMetricsInput): NativeFontMetrics => {
  const normalizedFontScale =
    Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const normalizedMaxFontSizeMultiplier =
    maxFontSizeMultiplier != null &&
    Number.isFinite(maxFontSizeMultiplier) &&
    maxFontSizeMultiplier >= 1
      ? maxFontSizeMultiplier
      : Number.POSITIVE_INFINITY;
  const effectiveFontScale =
    platform === 'android' || !allowFontScaling
      ? 1
      : Math.min(normalizedFontScale, normalizedMaxFontSizeMultiplier);

  return {
    allowFontScaling,
    fontScale: normalizedFontScale,
    fontSize: fontSize * effectiveFontScale,
    letterSpacing,
    lineHeight: lineHeight == null ? 0 : lineHeight * effectiveFontScale,
    maxFontSizeMultiplier: maxFontSizeMultiplier ?? 0,
  };
};
