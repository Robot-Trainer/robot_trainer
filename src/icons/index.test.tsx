import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Icons from './index';

describe('Icons', () => {
  const iconNames = Object.keys(Icons) as Array<keyof typeof Icons>;

  iconNames.forEach((iconName) => {
    describe(`${iconName} icon`, () => {
      it('renders correctly at 12px', () => {
        const IconComponent = Icons[iconName];
        const { container } = render(<IconComponent width={12} height={12} />);
        expect(container.firstChild).toMatchSnapshot();
      });

      it('renders correctly at 24px', () => {
        const IconComponent = Icons[iconName];
        const { container } = render(<IconComponent width={24} height={24} />);
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });
});
