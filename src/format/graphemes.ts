let segmenter: Intl.Segmenter | undefined;
let segmenterConstructor: typeof Intl.Segmenter | undefined;

const getSegmenter = (): Intl.Segmenter | undefined => {
  const constructor = Intl.Segmenter;
  if (constructor === segmenterConstructor) {
    return segmenter;
  }

  segmenterConstructor = constructor;
  segmenter = undefined;

  if (typeof constructor !== 'function') {
    return undefined;
  }

  try {
    const candidate = new constructor(undefined, { granularity: 'grapheme' });
    if (typeof candidate.segment === 'function') {
      segmenter = candidate;
    }
  } catch {
    segmenter = undefined;
  }

  return segmenter;
};

export const splitGraphemes = (value: string): string[] => {
  const currentSegmenter = getSegmenter();
  if (currentSegmenter == null) {
    return Array.from(value);
  }

  try {
    return Array.from(
      currentSegmenter.segment(value),
      ({ segment }) => segment
    );
  } catch {
    segmenter = undefined;
    return Array.from(value);
  }
};
