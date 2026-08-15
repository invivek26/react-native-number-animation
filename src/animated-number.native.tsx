import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import NativeNumberAnimationView, {
  type NativeNumberAnimationProps,
  type NativeNumberSlot,
} from './NumberAnimationViewNativeComponent';
import { createNumberPresentation } from './format/presentation';
import type { NumberPresentation, PlannedSlot } from './internal-types';
import { planTransition } from './motion/plan-transition';
import {
  getAnimationTimeout,
  resolveAnimation,
  type ResolvedAnimation,
} from './motion/timing';
import {
  createAnimationSession,
  resolveAnimationSession,
} from './motion/animation-session';
import {
  resolveAnimationState,
  shouldHandleAnimationEvent,
} from './motion/animation-policy';
import { useNumberAnimationEnabled } from './number-animation-provider';
import type { AnimatedNumberProps } from './types';
import { useReducedMotion } from './use-reduced-motion';

type NativeEvent = NativeSyntheticEvent<Readonly<{ revision: number }>>;

const NATIVE_STYLE = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
} as const;
const HIDDEN_TEXT_STYLE = { opacity: 0 } as const;

const toNativeSlots = (slots: readonly PlannedSlot[]): NativeNumberSlot[] =>
  slots.map(({ key, text, digitValue, delta, entering }) => ({
    delta,
    digitValue,
    entering,
    key,
    text,
  }));

const toInitialNativeSlots = (
  presentation: NumberPresentation
): NativeNumberSlot[] =>
  presentation.slots.map(({ key, text, digitValue }) => ({
    delta: 0,
    digitValue,
    entering: false,
    key,
    text,
  }));

type NativeTimingProps = Pick<
  NativeNumberAnimationProps,
  | 'digitDurationMs'
  | 'digitEasing'
  | 'digitX1'
  | 'digitY1'
  | 'digitX2'
  | 'digitY2'
  | 'digitDamping'
  | 'digitStiffness'
  | 'digitMass'
  | 'digitInitialVelocity'
  | 'layoutDurationMs'
  | 'layoutEasing'
  | 'layoutX1'
  | 'layoutY1'
  | 'layoutX2'
  | 'layoutY2'
  | 'layoutDamping'
  | 'layoutStiffness'
  | 'layoutMass'
  | 'layoutInitialVelocity'
  | 'opacityDurationMs'
  | 'opacityEasing'
  | 'opacityX1'
  | 'opacityY1'
  | 'opacityX2'
  | 'opacityY2'
  | 'opacityDamping'
  | 'opacityStiffness'
  | 'opacityMass'
  | 'opacityInitialVelocity'
>;

const toNativeTimingProps = (
  animation: ResolvedAnimation
): NativeTimingProps => ({
  digitDamping: animation.digit.damping,
  digitDurationMs: animation.digit.durationMs,
  digitEasing: animation.digit.easing,
  digitInitialVelocity: animation.digit.initialVelocity,
  digitMass: animation.digit.mass,
  digitStiffness: animation.digit.stiffness,
  digitX1: animation.digit.x1,
  digitX2: animation.digit.x2,
  digitY1: animation.digit.y1,
  digitY2: animation.digit.y2,
  layoutDamping: animation.layout.damping,
  layoutDurationMs: animation.layout.durationMs,
  layoutEasing: animation.layout.easing,
  layoutInitialVelocity: animation.layout.initialVelocity,
  layoutMass: animation.layout.mass,
  layoutStiffness: animation.layout.stiffness,
  layoutX1: animation.layout.x1,
  layoutX2: animation.layout.x2,
  layoutY1: animation.layout.y1,
  layoutY2: animation.layout.y2,
  opacityDamping: animation.opacity.damping,
  opacityDurationMs: animation.opacity.durationMs,
  opacityEasing: animation.opacity.easing,
  opacityInitialVelocity: animation.opacity.initialVelocity,
  opacityMass: animation.opacity.mass,
  opacityStiffness: animation.opacity.stiffness,
  opacityX1: animation.opacity.x1,
  opacityX2: animation.opacity.x2,
  opacityY1: animation.opacity.y1,
  opacityY2: animation.opacity.y2,
});

export const AnimatedNumber = forwardRef<
  ComponentRef<typeof View>,
  AnimatedNumberProps
>((props, ref) => {
  const {
    accessibilityLabel,
    allowFontScaling = true,
    animated = true,
    animation: animationProp,
    containerStyle,
    continuous = false,
    format,
    formattedValue: formattedValueProp,
    initialFormattedValue,
    initialValue,
    locales,
    mask = true,
    maxFontSizeMultiplier,
    onAnimationComplete,
    onAnimationStart,
    prefix,
    respectMotionPreference = true,
    style,
    suffix,
    trend = 'auto',
    value,
    ...viewProps
  } = props;
  const presentation = useMemo(
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
  const [initialPresentation] = useState(() => {
    if (initialValue == null) {
      return undefined;
    }

    return createNumberPresentation({
      format,
      formattedValue: initialFormattedValue,
      locales,
      prefix,
      suffix,
      value: initialValue,
    });
  });
  const committedPresentation = useRef(initialPresentation ?? presentation);
  const initialTargetFormattedValue = (initialPresentation ?? presentation)
    .formattedValue;
  const targetSessionRef = useRef(
    resolveAnimationSession(
      createAnimationSession(
        initialTargetFormattedValue,
        initialValue ?? value
      ),
      presentation.formattedValue,
      value
    )
  );
  const targetSession = resolveAnimationSession(
    targetSessionRef.current,
    presentation.formattedValue,
    value
  );
  targetSessionRef.current = targetSession;
  const revision = targetSession.revision;
  const initialRevision = 0;
  const [, setSettledRender] = useState(initialRevision);
  const settledRevisionRef = useRef(initialRevision);
  const providerEnabled = useNumberAnimationEnabled();
  const reduceMotion = useReducedMotion(respectMotionPreference);
  const { fontScale } = useWindowDimensions();
  const animation = useMemo(
    () => resolveAnimation(animationProp),
    [animationProp]
  );
  const transition = planTransition(
    committedPresentation.current,
    presentation,
    trend,
    continuous
  );
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const requestedFontSize = flattenedStyle.fontSize ?? 14;
  const normalizedFontScale =
    Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const normalizedMaxFontSizeMultiplier =
    maxFontSizeMultiplier != null &&
    Number.isFinite(maxFontSizeMultiplier) &&
    maxFontSizeMultiplier >= 1
      ? maxFontSizeMultiplier
      : Number.POSITIVE_INFINITY;
  const effectiveFontScale = allowFontScaling
    ? Math.min(normalizedFontScale, normalizedMaxFontSizeMultiplier)
    : 1;
  const fontSize = requestedFontSize * effectiveFontScale;
  const formattedValue = presentation.formattedValue;
  const isMultiline = formattedValue.includes('\n');
  const { active, rendererEnabled: nativeRendererEnabled } =
    resolveAnimationState({
      animated,
      isMultiline,
      providerEnabled,
      revision,
      settledRevision: settledRevisionRef.current,
    });
  const nativeRendererEnabledRef = useRef(nativeRendererEnabled);
  nativeRendererEnabledRef.current = nativeRendererEnabled;
  const latestCompletionCallback = useRef(onAnimationComplete);
  const latestStartCallback = useRef(onAnimationStart);
  latestCompletionCallback.current = onAnimationComplete;
  latestStartCallback.current = onAnimationStart;
  const animationTimeout = getAnimationTimeout(animation, reduceMotion);

  useLayoutEffect(() => {
    committedPresentation.current = presentation;
  }, [presentation]);

  useLayoutEffect(() => {
    if (nativeRendererEnabled || settledRevisionRef.current === revision) {
      return;
    }
    settledRevisionRef.current = revision;
  }, [nativeRendererEnabled, revision]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      if (settledRevisionRef.current === revision) {
        return;
      }
      settledRevisionRef.current = revision;
      setSettledRender((render) => render + 1);
      latestCompletionCallback.current?.(targetSession.event);
    }, animationTimeout);

    return () => clearTimeout(timeout);
  }, [active, animationTimeout, revision, targetSession.event]);

  const handleAnimationStart = ({ nativeEvent }: NativeEvent) => {
    if (
      !shouldHandleAnimationEvent({
        eventRevision: nativeEvent.revision,
        rendererEnabled: nativeRendererEnabledRef.current,
        revision,
        settledRevision: settledRevisionRef.current,
      })
    ) {
      return;
    }
    latestStartCallback.current?.(targetSession.event);
  };

  const handleAnimationComplete = ({ nativeEvent }: NativeEvent) => {
    if (
      !shouldHandleAnimationEvent({
        eventRevision: nativeEvent.revision,
        rendererEnabled: nativeRendererEnabledRef.current,
        revision,
        settledRevision: settledRevisionRef.current,
      })
    ) {
      return;
    }
    settledRevisionRef.current = revision;
    setSettledRender((render) => render + 1);
    latestCompletionCallback.current?.(targetSession.event);
  };

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
        style={[style, nativeRendererEnabled && HIDDEN_TEXT_STYLE]}
      >
        {formattedValue}
      </Text>
      {nativeRendererEnabled ? (
        <NativeNumberAnimationView
          {...toNativeTimingProps(animation)}
          active={active}
          digitGlyphs={[...presentation.digitGlyphs]}
          fontFamily={flattenedStyle.fontFamily}
          fontSize={fontSize}
          fontVariant={
            Array.isArray(flattenedStyle.fontVariant)
              ? flattenedStyle.fontVariant
              : typeof flattenedStyle.fontVariant === 'string'
                ? [flattenedStyle.fontVariant]
                : []
          }
          fontWeight={String(flattenedStyle.fontWeight ?? 'normal')}
          formattedValue={formattedValue}
          initialSlots={toInitialNativeSlots(
            initialPresentation ?? committedPresentation.current
          )}
          italic={flattenedStyle.fontStyle === 'italic'}
          letterSpacing={flattenedStyle.letterSpacing ?? 0}
          lineHeight={
            flattenedStyle.lineHeight == null
              ? 0
              : flattenedStyle.lineHeight * effectiveFontScale
          }
          mask={mask}
          onAnimationComplete={handleAnimationComplete}
          onAnimationStart={handleAnimationStart}
          pointerEvents="none"
          reduceMotion={reduceMotion}
          revision={revision}
          slots={toNativeSlots(transition.slots)}
          style={NATIVE_STYLE}
          textAlign={flattenedStyle.textAlign ?? 'auto'}
          textColor={flattenedStyle.color}
          trend={transition.trend}
          writingDirection={flattenedStyle.writingDirection ?? 'auto'}
        />
      ) : null}
    </View>
  );
});

AnimatedNumber.displayName = 'AnimatedNumber';
