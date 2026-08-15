import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  NumberAnimationProvider,
  useNumberAnimationEnabled,
} from '../number-animation-provider';

const EnabledProbe = () => <span>{String(useNumberAnimationEnabled())}</span>;

describe('NumberAnimationProvider', () => {
  test('enables animations when no provider exists', () => {
    expect(renderToStaticMarkup(createElement(EnabledProbe))).toBe(
      '<span>true</span>'
    );
  });

  test('makes disabled ancestors authoritative', () => {
    expect(
      renderToStaticMarkup(
        createElement(NumberAnimationProvider, {
          children: createElement(NumberAnimationProvider, {
            children: createElement(EnabledProbe),
            enabled: true,
          }),
          enabled: false,
        })
      )
    ).toBe('<span>false</span>');
  });
});
