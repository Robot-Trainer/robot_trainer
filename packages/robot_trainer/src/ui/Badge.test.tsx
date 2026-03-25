import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renders default props', () => {
    const { getByText } = render(<Badge>Test</Badge>);
    expect(getByText('Test')).toBeTruthy();
  });

  it('renders with label prop and custom props', () => {
    const { getByText } = render(
      <Badge color="red" variant="filled" size="medium" uppercase tooltip="tt" sx={{ mt: 1 }} className="my-class">
        LabelTest
      </Badge>
    );
    expect(getByText('LabelTest')).toBeTruthy();
  });

  it('renders with label taking precedence', () => {
    const { getByText } = render(<Badge label="LabelProp">Children prop</Badge>);
    expect(getByText('LabelProp')).toBeTruthy();
  });

  it('handles unknown color gracefully', () => {
    // @ts-expect-error - testing invalid color
    const { getByText } = render(<Badge color="unknown" label="Unk" />);
    expect(getByText('Unk')).toBeTruthy();
  });
});
