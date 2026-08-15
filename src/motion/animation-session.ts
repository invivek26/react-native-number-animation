import type { AnimationEvent } from '../types';

const MAX_REVISION = 2_147_483_647;

export type AnimationSession = Readonly<{
  event: AnimationEvent;
  revision: number;
}>;

export const createAnimationSession = (
  formattedValue: string,
  value: number,
  revision = 0
): AnimationSession => ({
  event: { formattedValue, value },
  revision,
});

export const resolveAnimationSession = (
  session: AnimationSession,
  formattedValue: string,
  value: number
): AnimationSession => {
  if (session.event.formattedValue === formattedValue) {
    return session;
  }

  return createAnimationSession(
    formattedValue,
    value,
    session.revision >= MAX_REVISION ? 1 : session.revision + 1
  );
};
