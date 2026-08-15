import type { AnimatedNumberTextStyle } from './types';

export const resolveNativeFontWeight = (
  fontWeight: AnimatedNumberTextStyle['fontWeight']
): string | undefined => (fontWeight == null ? undefined : String(fontWeight));
