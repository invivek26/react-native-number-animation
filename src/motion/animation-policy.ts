type AnimationStateInput = Readonly<{
  animated: boolean;
  isMultiline: boolean;
  providerEnabled: boolean;
  revision: number;
  settledRevision: number;
}>;

type AnimationState = Readonly<{
  active: boolean;
  rendererEnabled: boolean;
}>;

type AnimationEventState = Readonly<{
  eventRevision: number;
  rendererEnabled: boolean;
  revision: number;
  settledRevision: number;
}>;

export const resolveAnimationState = ({
  animated,
  isMultiline,
  providerEnabled,
  revision,
  settledRevision,
}: AnimationStateInput): AnimationState => {
  const rendererEnabled = animated && providerEnabled && !isMultiline;

  return {
    active: rendererEnabled && revision !== settledRevision,
    rendererEnabled,
  };
};

export const shouldHandleAnimationEvent = ({
  eventRevision,
  rendererEnabled,
  revision,
  settledRevision,
}: AnimationEventState) =>
  rendererEnabled && eventRevision === revision && settledRevision !== revision;
