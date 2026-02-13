import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '../themed-text';

describe('ThemedText', () => {
  it('renders text content', () => {
    render(<ThemedText>Hello world</ThemedText>);
    expect(screen.getByText('Hello world')).toBeOnTheScreen();
  });

  it('renders with different type variants', () => {
    const { rerender } = render(<ThemedText type="title">Title</ThemedText>);
    expect(screen.getByText('Title')).toBeOnTheScreen();

    rerender(<ThemedText type="subtitle">Subtitle</ThemedText>);
    expect(screen.getByText('Subtitle')).toBeOnTheScreen();

    rerender(<ThemedText type="link">Link</ThemedText>);
    expect(screen.getByText('Link')).toBeOnTheScreen();

    rerender(<ThemedText type="defaultSemiBold">Bold</ThemedText>);
    expect(screen.getByText('Bold')).toBeOnTheScreen();
  });

  it('defaults to the "default" type', () => {
    render(<ThemedText>Default</ThemedText>);
    const text = screen.getByText('Default');
    // Default type should have fontSize 16 and lineHeight 24
    expect(text).toHaveStyle({ fontSize: 16, lineHeight: 24 });
  });

  it('applies title styles', () => {
    render(<ThemedText type="title">Big Title</ThemedText>);
    const text = screen.getByText('Big Title');
    expect(text).toHaveStyle({ fontSize: 32, fontWeight: 'bold' });
  });
});
