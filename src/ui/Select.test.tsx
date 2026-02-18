import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Select from './Select';

describe('ui/Select', () => {
  it('renders a disabled placeholder when the current value is not in options', () => {
    render(
      <Select
        label="Test Select"
        value={"missing"}
        onChange={() => {}}
        options={[{ label: 'One', value: 'one' }]}
      />
    );

    // The fallback disabled item should be present
    expect(screen.getByText('(Selected) missing')).toBeInTheDocument();
    // MenuItem should be marked disabled (aria-disabled)
    const item = screen.getByText('(Selected) missing');
    const li = item.closest('li');
    expect(li).toHaveAttribute('aria-disabled', 'true');
  });
});
