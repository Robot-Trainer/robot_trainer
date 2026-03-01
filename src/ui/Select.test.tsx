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

    // The fallback selected placeholder should render in the closed select
    expect(screen.getByText('(Selected) missing')).toBeTruthy();
  });
});
