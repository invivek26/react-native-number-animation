import { forwardRef, useMemo, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createNumberPresentation } from './format/presentation';
import type { AnimatedNumberProps } from './types';
import { getViewProps } from './view-props';

const STATIC_TEXT_STYLE = StyleSheet.create({
  text: {
    backgroundColor: 'transparent',
  },
});

export const AnimatedNumber = forwardRef<
  ComponentRef<typeof View>,
  AnimatedNumberProps
>((props, ref) => {
  const {
    accessibilityLabel,
    allowFontScaling = true,
    containerStyle,
    format,
    formattedValue: formattedValueProp,
    locales,
    maxFontSizeMultiplier,
    prefix,
    style,
    suffix,
    value,
  } = props;
  const viewProps = getViewProps(props);
  const { formattedValue } = useMemo(
    () =>
      createNumberPresentation({
        format,
        formattedValue: formattedValueProp,
        locales,
        prefix,
        suffix,
        value,
      }),
    [format, formattedValueProp, locales, prefix, suffix, value]
  );

  return (
    <View
      {...viewProps}
      accessibilityLabel={accessibilityLabel ?? formattedValue}
      accessible={viewProps.accessible ?? true}
      ref={ref}
      style={containerStyle}
    >
      <Text
        accessible={false}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={1}
        style={[STATIC_TEXT_STYLE.text, style]}
      >
        {formattedValue}
      </Text>
    </View>
  );
});

AnimatedNumber.displayName = 'AnimatedNumber';
