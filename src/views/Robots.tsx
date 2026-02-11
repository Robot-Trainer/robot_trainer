import React from 'react';
import { Box } from '@mui/material';
import ResourceManager from '../ui/ResourceManager';
import { robotsTable } from '../db/schema';
import RobotForm from './RobotForm';

const RobotsView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Robots"
        table={robotsTable}
        renderForm={(props) => <RobotForm {...props} />}
      />
    </Box>
  );
};

export default RobotsView;
