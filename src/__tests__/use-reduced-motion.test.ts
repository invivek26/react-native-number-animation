import { beforeEach, expect, mock, test } from 'bun:test';
import * as React from 'react';

type Store = Readonly<{
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
}>;
type MotionHandler = (enabled: boolean) => void;

let store: Store | undefined;
let queryResult: () => Promise<boolean> = () => Promise.resolve(false);
let motionHandler: MotionHandler | undefined;

mock.module('react', () => ({
  ...React,
  useSyncExternalStore: (
    subscribe: Store['subscribe'],
    getSnapshot: Store['getSnapshot']
  ) => {
    store = { getSnapshot, subscribe };
    return getSnapshot();
  },
}));

mock.module('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: (_event: string, handler: MotionHandler) => {
      motionHandler = handler;
      return { remove: () => undefined };
    },
    isReduceMotionEnabled: () => queryResult(),
  },
}));

let moduleId = 0;

// Each test gets a fresh copy of the hook's module-level state.
const loadStore = async (): Promise<Store> => {
  moduleId += 1;
  const hook: typeof import('../use-reduced-motion') = await import(
    `../use-reduced-motion?test=${moduleId}`
  );
  // Called outside React: the mocked useSyncExternalStore captures the store.
  const readReducedMotion = hook.useReducedMotion;
  readReducedMotion(true);
  if (store == null) {
    throw new Error('useSyncExternalStore was not called');
  }
  return store;
};

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  store = undefined;
  motionHandler = undefined;
  queryResult = () => Promise.resolve(false);
});

test('allows motion before the system has answered', async () => {
  queryResult = () => new Promise<boolean>(() => undefined);
  const { getSnapshot, subscribe } = await loadStore();

  expect(getSnapshot()).toBe(false);
  subscribe(() => undefined);
  expect(getSnapshot()).toBe(false);
});

test('allows motion when the system query rejects', async () => {
  queryResult = () => Promise.reject(new Error('unavailable'));
  const { getSnapshot, subscribe } = await loadStore();

  subscribe(() => undefined);
  await flushPromises();

  expect(getSnapshot()).toBe(false);
});

test('follows the system setting once it answers', async () => {
  queryResult = () => Promise.resolve(true);
  const { getSnapshot, subscribe } = await loadStore();
  const listener = mock(() => undefined);

  subscribe(listener);
  await flushPromises();
  expect(getSnapshot()).toBe(true);

  motionHandler?.(false);
  expect(getSnapshot()).toBe(false);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('keeps the last known value after the last listener leaves', async () => {
  const { getSnapshot, subscribe } = await loadStore();

  const unsubscribe = subscribe(() => undefined);
  await flushPromises();
  unsubscribe();
  expect(getSnapshot()).toBe(false);

  queryResult = () => new Promise<boolean>(() => undefined);
  subscribe(() => undefined);
  expect(getSnapshot()).toBe(false);
});

test('keeps a known reduced-motion setting when a later query fails', async () => {
  queryResult = () => Promise.resolve(true);
  const { getSnapshot, subscribe } = await loadStore();

  const unsubscribe = subscribe(() => undefined);
  await flushPromises();
  unsubscribe();

  queryResult = () => Promise.reject(new Error('unavailable'));
  subscribe(() => undefined);
  await flushPromises();

  expect(getSnapshot()).toBe(true);
});
