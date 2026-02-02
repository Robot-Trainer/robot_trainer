import React from 'react';
import ResourceManager from '../ui/ResourceManager';
import { robotsTable } from '../db/schema';
import RobotForm from './RobotForm';

const RobotsView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager 
        title="Robots" 
        table={robotsTable} 
        renderForm={(props) => <RobotForm {...props} />}
      />
    </div>
  );
};

export default RobotsView;
