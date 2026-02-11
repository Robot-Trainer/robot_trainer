import React from 'react';
import { Box } from '@mui/material';
import ResourceManager from '../ui/ResourceManager';
import { sessionsTable } from '../db/schema';
import SessionForm from './SessionForm';

const SessionsView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Sessions"
        table={sessionsTable}
        renderForm={(props) => <SessionForm {...props} />}
      />
    </Box>
  );
};

export default SessionsView;
