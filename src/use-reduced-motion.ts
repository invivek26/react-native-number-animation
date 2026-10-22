import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

type Listener = () => void;

const listeners = new Set<Listener>();
// Motion is allowed until the system reports otherwise.
let reduceMotion = false;
let listening = false;
let subscriptionGeneration = 0;
let nativeSubscription: ReturnType<
  typeof AccessibilityInfo.addEventListener
> | null = null;

const notifyListeners = (): void => {
  listeners.forEach((listener) => listener());
};

const setReduceMotion = (value: boolean): void => {
  if (reduceMotion === value) {
    return;
  }
  reduceMotion = value;
  notifyListeners();
};

const startListening = (): void => {
  if (listening) {
    return;
  }
  listening = true;
  subscriptionGeneration += 1;
  const generation = subscriptionGeneration;
  // A failed query keeps the last known value.
  AccessibilityInfo.isReduceMotionEnabled().then(
    (value) => {
      if (listening && generation === subscriptionGeneration) {
        setReduceMotion(value);
      }
    },
    () => undefined
  );
  nativeSubscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    (value) => {
      if (listening && generation === subscriptionGeneration) {
        setReduceMotion(value);
      }
    }
  );
};

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  startListening();

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) {
      return;
    }
    nativeSubscription?.remove();
    nativeSubscription = null;
    listening = false;
    subscriptionGeneration += 1;
  };
};

const emptySubscribe = (): (() => void) => () => undefined;
const getSnapshot = (): boolean => reduceMotion;
const getDisabledSnapshot = (): boolean => false;

export const useReducedMotion = (enabled: boolean): boolean =>
  useSyncExternalStore(
    enabled ? subscribe : emptySubscribe,
    enabled ? getSnapshot : getDisabledSnapshot,
    enabled ? getSnapshot : getDisabledSnapshot
  );
