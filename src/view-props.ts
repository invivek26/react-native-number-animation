import type { ViewProps } from 'react-native';
import type { AnimatedNumberProps } from './types';

const COMPONENT_PROP_KEYS = new Set([
  'accessibilityLabel',
  'allowFontScaling',
  'animated',
  'animation',
  'containerStyle',
  'continuous',
  'format',
  'formattedValue',
  'initialFormattedValue',
  'initialValue',
  'locales',
  'mask',
  'maxFontSizeMultiplier',
  'onAnimationComplete',
  'onAnimationStart',
  'prefix',
  'respectMotionPreference',
  'style',
  'suffix',
  'trend',
  'value',
]);

export const getViewProps = (props: AnimatedNumberProps): ViewProps =>
  Object.fromEntries(
    Object.entries(props).filter(([key]) => !COMPONENT_PROP_KEYS.has(key))
  );
