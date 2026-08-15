import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AnimatedNumber } from 'react-native-number-animation';
import type {
  AnimationEvent,
  AnimationTiming,
} from 'react-native-number-animation';
import { ShowcaseScreen } from './showcase-screen';

const STRESS_COUNTERS = Array.from({ length: 24 }, (_, index) => index);
const INITIAL_VALUE = 12_345.67;

type GalleryState = Readonly<{
  carryValue: number;
  completionCount: number;
  rapid: boolean;
  tick: number;
  value: number;
}>;

type GalleryAction =
  | Readonly<{ type: 'adjust'; amount: number }>
  | Readonly<{ type: 'carry' }>
  | Readonly<{ type: 'complete'; event: AnimationEvent }>
  | Readonly<{ type: 'reset' }>
  | Readonly<{ type: 'stopRapid' }>
  | Readonly<{ type: 'tick' }>
  | Readonly<{ type: 'toggleRapid' }>;

const INITIAL_STATE: GalleryState = {
  carryValue: 999,
  completionCount: 0,
  rapid: false,
  tick: 0,
  value: INITIAL_VALUE,
};

const galleryReducer = (
  state: GalleryState,
  action: GalleryAction
): GalleryState => {
  if (action.type === 'adjust') {
    return { ...state, value: state.value + action.amount };
  }

  if (action.type === 'carry') {
    return {
      ...state,
      carryValue: state.carryValue >= 1001 ? 998 : state.carryValue + 1,
    };
  }

  if (action.type === 'complete') {
    return { ...state, completionCount: state.completionCount + 1 };
  }

  if (action.type === 'reset') {
    return INITIAL_STATE;
  }

  if (action.type === 'tick') {
    return {
      ...state,
      tick: state.tick + 1,
      value: 10_000 + ((state.tick * 7_919) % 89_000) / 100,
    };
  }

  if (action.type === 'stopRapid') {
    return { ...state, rapid: false };
  }

  return { ...state, rapid: !state.rapid };
};

const resolveCompactValue = (value: number): string => {
  const magnitude = Math.abs(value);

  if (magnitude < 10_000) {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(value);
  }

  const units = [
    { minimum: 1_000_000_000_000, suffix: 'T' },
    { minimum: 1_000_000_000, suffix: 'B' },
    { minimum: 1_000_000, suffix: 'M' },
    { minimum: 1_000, suffix: 'K' },
  ] as const;
  const unit = units.find(({ minimum }) => magnitude >= minimum) ?? units[3];
  const compactValue = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value / unit.minimum);

  return `${compactValue}${unit.suffix}`;
};

const springTiming: AnimationTiming = {
  duration: 650,
  easing: { type: 'spring', damping: 16, stiffness: 170, mass: 0.8 },
};

const cubicTiming: AnimationTiming = {
  duration: 520,
  easing: { type: 'cubicBezier', x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
};

type ButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  testID: string;
  active?: boolean;
}>;

const ControlButton = ({
  active = false,
  label,
  onPress,
  testID,
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      active && styles.buttonActive,
      pressed && styles.buttonPressed,
    ]}
    testID={testID}
  >
    <Text style={[styles.buttonText, active && styles.buttonTextActive]}>
      {label}
    </Text>
  </Pressable>
);

type CardProps = Readonly<{
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  testID: string;
}>;

const GalleryCard = ({ children, eyebrow, testID, title }: CardProps) => (
  <View style={styles.card} testID={testID}>
    <View style={styles.cardHeader}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

type LabScreenProps = Readonly<{
  onClose: () => void;
}>;

const LabScreen = ({ onClose }: LabScreenProps) => {
  const [state, dispatch] = useReducer(galleryReducer, INITIAL_STATE);
  const stressValues = useMemo(
    () =>
      STRESS_COUNTERS.map(
        (index) => state.value + index * 137 + state.tick * (index + 1)
      ),
    [state.tick, state.value]
  );

  useEffect(() => {
    if (!state.rapid) {
      return undefined;
    }

    const interval = setInterval(() => dispatch({ type: 'tick' }), 90);
    const timeout = setTimeout(() => dispatch({ type: 'stopRapid' }), 20_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state.rapid]);

  return (
    <View style={styles.screen} testID="gallery-screen">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        testID="gallery-scroll"
      >
        <View style={styles.hero}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.showcaseButton}
            testID="close-lab-button"
          >
            <Text style={styles.showcaseButtonText}>Showcase</Text>
          </Pressable>
          <Text style={styles.kicker}>NATIVE NUMBER LAB</Text>
          <Text style={styles.title}>Every digit, in motion.</Text>
          <Text style={styles.subtitle}>
            Formatting, direction, timing, and load—all on one screen.
          </Text>
          <AnimatedNumber
            format={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }}
            initialValue={0}
            style={styles.heroNumber}
            testID="hero-number"
            value={state.value}
          />
        </View>

        <View style={styles.controlPanel} testID="controls">
          <View style={styles.controlRow}>
            <ControlButton
              label="− 1,000"
              onPress={() => dispatch({ type: 'adjust', amount: -1_000 })}
              testID="decrement-button"
            />
            <ControlButton
              label="+ 1,000"
              onPress={() => dispatch({ type: 'adjust', amount: 1_000 })}
              testID="increment-button"
            />
          </View>
          <View style={styles.controlRow}>
            <ControlButton
              active={state.rapid}
              label={state.rapid ? 'Stop rapid' : 'Rapid 20s burst'}
              onPress={() => dispatch({ type: 'stopRapid' })}
              testID="rapid-button"
            />
            <ControlButton
              label="Reset"
              onPress={() => dispatch({ type: 'reset' })}
              testID="reset-button"
            />
          </View>
          <Text style={styles.telemetry} testID="reliability-status">
            {state.rapid ? 'RAPID RUNNING' : 'READY'} · tick {state.tick} ·{' '}
            {state.completionCount} completions
          </Text>
        </View>

        <GalleryCard
          eyebrow="01 · FUNDAMENTALS"
          testID="formatting-card"
          title="Money, grouping & fractions"
        >
          <AnimatedNumber
            format={{
              currency: 'USD',
              currencyDisplay: 'narrowSymbol',
              minimumFractionDigits: 2,
              style: 'currency',
            }}
            style={styles.primaryNumber}
            testID="currency-number"
            value={state.value}
          />
          <View style={styles.divider} />
          <Text style={styles.label}>Compact resolver · switches at 10K</Text>
          <AnimatedNumber
            formattedValue={resolveCompactValue(state.value)}
            style={styles.secondaryNumber}
            testID="compact-number"
            value={state.value}
          />
        </GalleryCard>

        <GalleryCard
          eyebrow="02 · TEXT & LOCALE"
          testID="locale-card"
          title="Numbers belong everywhere"
        >
          <Text style={styles.label}>Preformatted mixed content</Text>
          <AnimatedNumber
            formattedValue={`Q${Math.round(state.value)} / 50,000 kg`}
            style={styles.secondaryNumber}
            testID="preformatted-number"
            value={state.value}
          />
          <View style={styles.divider} />
          <Text style={[styles.label, styles.rtlText]}>أرقام عربية</Text>
          <View style={styles.rtlRow}>
            <AnimatedNumber
              format={{
                currency: 'SAR',
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
                style: 'currency',
              }}
              locales="ar-EG-u-nu-arab"
              style={[styles.secondaryNumber, styles.rtlNumber]}
              testID="arabic-number"
              value={-Math.abs(state.value)}
            />
          </View>
        </GalleryCard>

        <GalleryCard
          eyebrow="03 · DIRECTION"
          testID="trend-card"
          title="Forced trends & continuous carry"
        >
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.label}>Always up</Text>
              <AnimatedNumber
                style={styles.metricNumber}
                testID="trend-up-number"
                trend="up"
                value={Math.round(state.value)}
              />
            </View>
            <View style={styles.metric}>
              <Text style={styles.label}>Always down</Text>
              <AnimatedNumber
                style={styles.metricNumber}
                testID="trend-down-number"
                trend="down"
                value={Math.round(state.value)}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.inlineControl}>
            <View>
              <Text style={styles.label}>Odometer carry</Text>
              <AnimatedNumber
                continuous
                style={styles.secondaryNumber}
                testID="carry-number"
                value={state.carryValue}
              />
            </View>
            <ControlButton
              label="Carry +1"
              onPress={() => dispatch({ type: 'carry' })}
              testID="carry-button"
            />
          </View>
        </GalleryCard>

        <GalleryCard
          eyebrow="04 · MOTION CURVES"
          testID="timing-card"
          title="Spring energy, cubic precision"
        >
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.label}>Spring</Text>
              <AnimatedNumber
                animation={{ digit: springTiming, layout: springTiming }}
                style={styles.metricNumber}
                testID="spring-number"
                value={Math.round(state.value)}
              />
            </View>
            <View style={styles.metric}>
              <Text style={styles.label}>Cubic bezier</Text>
              <AnimatedNumber
                animation={{ digit: cubicTiming, opacity: cubicTiming }}
                style={styles.metricNumber}
                testID="cubic-number"
                value={Math.round(state.value)}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.label}>System Reduce Motion aware</Text>
          <AnimatedNumber
            onAnimationComplete={(event) =>
              dispatch({ type: 'complete', event })
            }
            respectMotionPreference
            style={styles.secondaryNumber}
            testID="reduced-motion-number"
            value={state.value}
          />
          <View style={styles.divider} />
          <Text style={styles.label}>Static fallback · animated=false</Text>
          <AnimatedNumber
            animated={false}
            style={styles.secondaryNumber}
            testID="static-number"
            value={state.value}
          />
          <Text style={styles.caption}>
            Motion-aware animation is the default; animated=false always renders
            the final value immediately.
          </Text>
        </GalleryCard>

        <GalleryCard
          eyebrow="05 · NATIVE LOAD TEST"
          testID="stress-card"
          title="24 counters, one beat"
        >
          <View style={styles.stressGrid} testID="stress-grid">
            {stressValues.map((value, index) => (
              <View key={STRESS_COUNTERS[index]} style={styles.stressCell}>
                <Text style={styles.stressLabel}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <AnimatedNumber
                  format={{ maximumFractionDigits: 0 }}
                  onAnimationComplete={(event) =>
                    dispatch({ type: 'complete', event })
                  }
                  style={styles.stressNumber}
                  testID={`stress-number-${index + 1}`}
                  value={value}
                />
              </View>
            ))}
          </View>
          {state.rapid ? (
            <ControlButton
              active
              label="Stop rapid updates"
              onPress={() => dispatch({ type: 'toggleRapid' })}
              testID="stop-rapid-button"
            />
          ) : null}
          <Text style={styles.caption} testID="gallery-end">
            Deterministic values exercise reconciliation, native layout, and
            interrupted animations under rapid updates.
          </Text>
        </GalleryCard>
      </ScrollView>
    </View>
  );
};

export const App = () => {
  const [labVisible, setLabVisible] = useState(false);

  if (labVisible) {
    return <LabScreen onClose={() => setLabVisible(false)} />;
  }

  return (
    <ShowcaseScreen
      onOpenLab={__DEV__ ? () => setLabVisible(true) : undefined}
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07110e' },
  content: { paddingBottom: 48 },
  hero: {
    backgroundColor: '#0b2019',
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: Platform.select({ android: 48, default: 24 }),
  },
  showcaseButton: {
    alignSelf: 'flex-end',
    borderColor: '#2a5545',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  showcaseButtonText: { color: '#9eb8ac', fontSize: 11, fontWeight: '800' },
  kicker: {
    color: '#77e0ad',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  title: {
    color: '#f3fbf6',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 8,
  },
  subtitle: {
    color: '#9eb8ac',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 360,
  },
  heroNumber: {
    color: '#e9fff3',
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  controlPanel: {
    backgroundColor: '#10271f',
    borderBottomColor: '#1c3c31',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 16,
  },
  controlRow: { flexDirection: 'row', gap: 10 },
  button: {
    alignItems: 'center',
    backgroundColor: '#18382d',
    borderColor: '#2a5545',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  buttonActive: { backgroundColor: '#77e0ad', borderColor: '#77e0ad' },
  buttonPressed: { opacity: 0.72 },
  buttonText: { color: '#d9eee4', fontSize: 14, fontWeight: '700' },
  buttonTextActive: { color: '#07110e' },
  telemetry: {
    color: '#77e0ad',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f5f1e8',
    borderColor: '#d8d2c4',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 14,
    marginTop: 14,
    overflow: 'hidden',
    padding: 18,
  },
  cardHeader: { marginBottom: 10 },
  eyebrow: {
    color: '#48856d',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cardTitle: {
    color: '#13251e',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  primaryNumber: {
    color: '#10271f',
    fontSize: 38,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 46,
  },
  secondaryNumber: {
    color: '#18382d',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 36,
  },
  label: {
    color: '#64736c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  caption: { color: '#738078', fontSize: 12, lineHeight: 18, marginTop: 6 },
  divider: { backgroundColor: '#ded8cb', height: 1, marginVertical: 10 },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  rtlRow: { alignItems: 'flex-end' },
  rtlNumber: { textAlign: 'right', writingDirection: 'rtl' },
  metricRow: { flexDirection: 'row', gap: 12 },
  metric: {
    backgroundColor: '#ebe6dc',
    borderRadius: 14,
    flex: 1,
    gap: 4,
    minWidth: 0,
    padding: 12,
  },
  metricNumber: {
    color: '#18382d',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 28,
  },
  inlineControl: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stressCell: {
    backgroundColor: '#13251e',
    borderRadius: 10,
    padding: 8,
    width: '31.5%',
  },
  stressLabel: { color: '#77e0ad', fontSize: 9, fontWeight: '800' },
  stressNumber: {
    color: '#f1f7f3',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 18,
  },
});
