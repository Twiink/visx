import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Zoom, inverseMatrix } from '../src';

describe('<Zoom />', () => {
  it('should be defined', () => {
    expect(Zoom).toBeDefined();
  });

  it('composes successive scales in one event', () => {
    const { getByRole, getByTestId } = render(
      <Zoom width={400} height={400}>
        {(zoom) => (
          <button
            type="button"
            data-testid="matrix"
            onClick={() => {
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
            }}
          >
            {zoom.toString()}
          </button>
        )}
      </Zoom>,
    );
    fireEvent.click(getByRole('button'));
    expect(getByTestId('matrix')).toHaveTextContent('matrix(8, 0, 0, 8, 0, 0)');
  });

  it('composes translation commands with the current constrained matrix', () => {
    const { getByRole } = render(
      <Zoom width={400} height={400} scaleXMax={3} scaleYMax={3}>
        {(zoom) => (
          <button
            type="button"
            onClick={() => {
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.translate({ translateX: 10, translateY: 5 });
              zoom.translate({ translateX: 10, translateY: 5 });
            }}
          >
            {zoom.toString()}
          </button>
        )}
      </Zoom>,
    );
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent('matrix(2, 0, 0, 2, 40, 20)');
  });

  it('keeps a scale when setting translation in the same event', () => {
    const { getByRole } = render(
      <Zoom width={400} height={400}>
        {(zoom) => (
          <button
            type="button"
            onClick={() => {
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.setTranslate({ translateX: 10, translateY: 5 });
            }}
          >
            {zoom.toString()}
          </button>
        )}
      </Zoom>,
    );
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent('matrix(2, 0, 0, 2, 10, 5)');
  });

  it.each([
    ['center', 'matrix(2, 0, 0, 2, -200, -200)'],
    ['translateTo', 'matrix(2, 0, 0, 2, 50, 25)'],
    ['reset', 'matrix(2, 0, 0, 2, 0, 0)'],
  ])('applies %s after a queued scale', (command, expected) => {
    const { getByRole } = render(
      <React.StrictMode>
        <Zoom width={400} height={400}>
          {(zoom) => (
            <button
              type="button"
              onClick={() => {
                zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
                if (command === 'center') zoom.center();
                if (command === 'translateTo') zoom.translateTo({ x: 100, y: 50 });
                if (command === 'reset') {
                  zoom.reset();
                  zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
                }
              }}
            >
              {zoom.toString()}
            </button>
          )}
        </Zoom>
      </React.StrictMode>,
    );
    fireEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveTextContent(expected);
  });

  it('passes each accepted matrix to a custom constraint', () => {
    const previousScales: number[] = [];
    const { getByRole } = render(
      <Zoom
        width={400}
        height={400}
        constrain={(next, previous) => {
          previousScales.push(previous.scaleX);
          return next.scaleX > 4 ? previous : next;
        }}
      >
        {(zoom) => (
          <button
            type="button"
            onClick={() => {
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
              zoom.scale({ scaleX: 2, point: { x: 0, y: 0 } });
            }}
          >
            {zoom.toString()}
          </button>
        )}
      </Zoom>,
    );
    fireEvent.click(getByRole('button'));
    expect(previousScales).toEqual([1, 2, 4]);
    expect(getByRole('button')).toHaveTextContent('matrix(4, 0, 0, 4, 0, 0)');
  });

  it('starts a drag from a translation queued in the same event', () => {
    const { getByRole } = render(
      <Zoom width={400} height={400}>
        {(zoom) => (
          <button
            type="button"
            onMouseDown={(event) => {
              zoom.setTranslate({ translateX: 10, translateY: 20 });
              zoom.dragStart(event);
            }}
            onMouseMove={zoom.dragMove}
            onMouseUp={zoom.dragEnd}
          >
            {zoom.toString()}
          </button>
        )}
      </Zoom>,
    );
    const button = getByRole('button');
    fireEvent.mouseDown(button, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(button, { clientX: 5, clientY: 7 });
    fireEvent.mouseUp(button);
    expect(button).toHaveTextContent('matrix(1, 0, 0, 1, 15, 27)');
  });

  it('should render the children and pass zoom params', () => {
    const initialTransform = {
      scaleX: 1.27,
      scaleY: 1.27,
      translateX: -211.62,
      translateY: 162.59,
      skewX: 0,
      skewY: 0,
    };

    const { getByText } = render(
      <Zoom
        width={400}
        height={400}
        scaleXMin={1 / 2}
        scaleXMax={4}
        scaleYMin={1 / 2}
        scaleYMax={4}
        initialTransformMatrix={initialTransform}
      >
        {({ transformMatrix }) => {
          const { scaleX, scaleY, translateX, translateY } = transformMatrix;
          return <div>{[scaleX, scaleY, translateX, translateY].join(',')}</div>;
        }}
      </Zoom>,
    );

    expect(getByText('1.27,1.27,-211.62,162.59')).toBeInTheDocument();
  });
});

describe('inverseMatrix', () => {
  it('should be defined', () => {
    expect(inverseMatrix).toBeDefined();
  });
});
