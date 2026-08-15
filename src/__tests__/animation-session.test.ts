import { describe, expect, test } from 'bun:test';

import {
  createAnimationSession,
  resolveAnimationSession,
} from '../motion/animation-session';

describe('animation sessions', () => {
  test('increments revisions for distinct formatted targets', () => {
    const first = createAnimationSession('Z#T[W&1m{6wZ', 1);
    const second = resolveAnimationSession(first, 'oj p|skv+e5/', 2);

    expect(second.revision).toBe(1);
    expect(second.event).toEqual({
      formattedValue: 'oj p|skv+e5/',
      value: 2,
    });
  });

  test('keeps the event snapshot while the formatted target is unchanged', () => {
    const first = createAnimationSession('1', 1.1, 7);
    const second = resolveAnimationSession(first, '1', 1.4);

    expect(second).toBe(first);
    expect(second.event.value).toBe(1.1);
  });

  test('wraps revisions inside the signed Int32 range', () => {
    const first = createAnimationSession('1', 1, 2_147_483_647);

    expect(resolveAnimationSession(first, '2', 2).revision).toBe(1);
  });
});
