import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AnimatedNumber } from 'react-native-number-animation';

const SHOWCASE_VALUES = [
  999.75, 1_000.25, 9_999.99, 10_000, 98_765.43, 12_345.67,
] as const;
const SHOWCASE_INTERVAL_MS = 1_500;
const MONEY_FORMAT = {
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  style: 'currency',
} as const;
const INTEGER_FORMAT = { maximumFractionDigits: 0 } as const;
const ARABIC_FORMAT = {
  currency: 'SAR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
} as const;

type ShowcaseScreenProps = Readonly<{
  onOpenLab?: () => void;
}>;

const resolveCompactValue = (value: number): string => {
  const magnitude = Math.abs(value);

  if (magnitude < 10_000) {
    return new Intl.NumberFormat(undefined, INTEGER_FORMAT).format(value);
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
};

export const ShowcaseScreen = ({ onOpenLab }: ShowcaseScreenProps) => {
  const [step, setStep] = useState(0);
  const value = SHOWCASE_VALUES[step] ?? SHOWCASE_VALUES[0];
  const carryValue = 998 + step;
  const platformEngine =
    Platform.OS === 'ios' ? 'CORE ANIMATION' : 'ANDROID CANVAS';

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((currentStep) => (currentStep + 1) % SHOWCASE_VALUES.length);
    }, SHOWCASE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.screen} testID="showcase-screen">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'android' ? styles.androidContent : null,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.mark}>
              <Text style={styles.markText}>N</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>NUMBER ANIMATION</Text>
              <Text style={styles.engine}>{platformEngine} · FABRIC</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <Text style={styles.title}>{'Numbers that\nfeel alive.'}</Text>
          <Text style={styles.subtitle}>
            Native rolling motion, locale-aware formatting, and zero JavaScript
            work per frame.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.darkLabel}>LIVE BALANCE</Text>
            <Text style={styles.darkMeta}>AUTO · 1.5S</Text>
          </View>
          <AnimatedNumber
            format={MONEY_FORMAT}
            initialValue={0}
            style={styles.heroNumber}
            testID="showcase-hero-number"
            value={value}
          />
          <View style={styles.rule} />
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>INTERRUPTIBLE</Text>
            <Text style={styles.heroFooterText}>LOCALE SAFE</Text>
            <Text style={styles.heroFooterText}>ACCESSIBLE</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.label}>ODOMETER CARRY</Text>
            <AnimatedNumber
              continuous
              format={INTEGER_FORMAT}
              style={styles.metricNumber}
              testID="showcase-carry-number"
              value={carryValue}
            />
            <Text style={styles.metricCaption}>Every lower wheel can turn</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.label}>COMPACT VALUE</Text>
            <AnimatedNumber
              formattedValue={resolveCompactValue(value)}
              style={styles.metricNumber}
              testID="showcase-compact-number"
              value={value}
            />
            <Text style={styles.metricCaption}>
              Formatting stays in your API
            </Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.label}>MIXED CONTENT</Text>
            <Text style={styles.meta}>PREFIX · UNIT · GROUPING</Text>
          </View>
          <AnimatedNumber
            formattedValue={`Q${Math.round(value)} / 50,000 kg`}
            style={styles.contentNumber}
            testID="showcase-mixed-number"
            value={value}
          />
        </View>

        <View style={styles.localeCard}>
          <View style={styles.localeCopy}>
            <Text style={styles.label}>WORLD READY</Text>
            <Text style={styles.localeTitle}>Localized digits, natively.</Text>
            <Text style={styles.localeCaption}>
              RTL ordering and Intl output remain intact.
            </Text>
          </View>
          <View style={styles.arabicNumberWrap}>
            <AnimatedNumber
              format={ARABIC_FORMAT}
              locales="ar-EG-u-nu-arab"
              style={styles.arabicNumber}
              testID="showcase-arabic-number"
              value={-Math.abs(value)}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            NATIVE AT REST · NATIVE IN MOTION
          </Text>
          <Text style={styles.footerVersion}>iOS 17+ · ANDROID 7+</Text>
        </View>

        {onOpenLab ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenLab}
            style={({ pressed }) => [
              styles.labButton,
              pressed ? styles.labButtonPressed : null,
            ]}
            testID="open-lab-button"
          >
            <Text style={styles.labButtonText}>Open reliability lab</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { backgroundColor: '#061510', flex: 1 },
  content: { gap: 14, padding: 18, paddingBottom: 32 },
  androidContent: {
    paddingTop: (NativeStatusBar.currentHeight ?? 0) + 18,
  },
  header: { gap: 12, paddingHorizontal: 4, paddingVertical: 8 },
  brandRow: { alignItems: 'center', flexDirection: 'row' },
  mark: {
    alignItems: 'center',
    backgroundColor: '#78edb3',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  markText: { color: '#061510', fontSize: 21, fontWeight: '900' },
  brandCopy: { flex: 1, gap: 2, paddingHorizontal: 11 },
  brand: {
    color: '#eafff3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  engine: { color: '#78988b', fontSize: 9, fontWeight: '800' },
  liveBadge: {
    alignItems: 'center',
    borderColor: '#28483b',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    backgroundColor: '#78edb3',
    borderCurve: 'continuous',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  liveText: { color: '#9bb7ac', fontSize: 9, fontWeight: '900' },
  title: {
    color: '#f4fff8',
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: -1.4,
    lineHeight: 39,
  },
  subtitle: { color: '#91aa9f', fontSize: 14, lineHeight: 20, maxWidth: 350 },
  heroCard: {
    backgroundColor: '#f1eee5',
    borderCurve: 'continuous',
    borderRadius: 24,
    gap: 12,
    padding: 20,
  },
  cardHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  darkLabel: {
    color: '#4e665c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  darkMeta: { color: '#7f8d87', fontSize: 9, fontWeight: '800' },
  heroNumber: {
    color: '#092119',
    fontSize: 49,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 58,
  },
  rule: { backgroundColor: '#d8d4ca', height: StyleSheet.hairlineWidth },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  heroFooterText: {
    color: '#65766e',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  metricGrid: { flexDirection: 'row', gap: 12 },
  metricCard: {
    backgroundColor: '#10271f',
    borderColor: '#1e4134',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minWidth: 0,
    padding: 16,
  },
  label: {
    color: '#78edb3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  meta: { color: '#627e72', fontSize: 8, fontWeight: '800' },
  metricNumber: {
    color: '#f0fff6',
    fontSize: 29,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 35,
  },
  metricCaption: { color: '#78978a', fontSize: 10, lineHeight: 14 },
  contentCard: {
    backgroundColor: '#0c2019',
    borderColor: '#1e4134',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    gap: 9,
    padding: 16,
  },
  contentNumber: {
    color: '#effff6',
    fontSize: 25,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 34,
  },
  localeCard: {
    alignItems: 'center',
    backgroundColor: '#0c2019',
    borderColor: '#1e4134',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  localeCopy: { flex: 1, gap: 5 },
  localeTitle: { color: '#effff6', fontSize: 14, fontWeight: '800' },
  localeCaption: { color: '#78978a', fontSize: 10, lineHeight: 14 },
  arabicNumberWrap: { alignItems: 'flex-end', flex: 1 },
  arabicNumber: {
    color: '#f0fff6',
    fontSize: 21,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  footerText: { color: '#638176', fontSize: 8, fontWeight: '900' },
  footerVersion: { color: '#49675b', fontSize: 8, fontWeight: '800' },
  labButton: {
    alignItems: 'center',
    borderColor: '#28483b',
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  labButtonPressed: { opacity: 0.7 },
  labButtonText: { color: '#91aa9f', fontSize: 12, fontWeight: '800' },
});
