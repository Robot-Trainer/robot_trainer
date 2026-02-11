import React from 'react';
import { Card as MuiCard } from '@mui/material';

type Props = {
  children?: React.ReactNode;
  className?: string;
};

export const Card: React.FC<Props> = ({ children, className = '' }) => (
  <MuiCard className={className}>
    {children}
  </MuiCard>
);

export default Card;
