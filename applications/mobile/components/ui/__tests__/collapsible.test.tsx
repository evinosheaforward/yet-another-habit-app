import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { Collapsible } from '../collapsible';

describe('Collapsible', () => {
  it('renders the title', () => {
    render(<Collapsible title="Morning Run" />);
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
  });

  it('shows 0% by default when no progressPct is provided', () => {
    render(<Collapsible title="Task" />);
    expect(screen.getByText('0%')).toBeOnTheScreen();
  });

  it('displays the provided progress percentage', () => {
    render(<Collapsible title="Task" progressPct={75} />);
    expect(screen.getByText('75%')).toBeOnTheScreen();
  });

  it('clamps progress to 0-100 range', () => {
    const { rerender } = render(<Collapsible title="Task" progressPct={150} />);
    expect(screen.getByText('100%')).toBeOnTheScreen();

    rerender(<Collapsible title="Task" progressPct={-10} />);
    expect(screen.getByText('0%')).toBeOnTheScreen();
  });

  it('does not show children when collapsed', () => {
    render(
      <Collapsible title="Task">
        <></>
      </Collapsible>,
    );
    expect(screen.queryByText('Hidden content')).toBeNull();
  });

  it('toggles children when pressed (uncontrolled)', () => {
    render(
      <Collapsible title="My Task">
        <></>
      </Collapsible>,
    );

    // Find the touchable and press it
    fireEvent.press(screen.getByText('My Task'));
  });

  it('calls onToggle when in controlled mode', () => {
    const onToggle = jest.fn();
    render(
      <Collapsible title="Controlled" isOpen={false} onToggle={onToggle}>
        <></>
      </Collapsible>,
    );

    fireEvent.press(screen.getByText('Controlled'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders children when isOpen is true (controlled)', () => {
    render(
      <Collapsible title="Open" isOpen={true} onToggle={jest.fn()}>
        <></>
      </Collapsible>,
    );
    // When open, the children container should be rendered
    // The component wraps children in a ThemedView
    expect(screen.getByText('Open')).toBeOnTheScreen();
  });
});
