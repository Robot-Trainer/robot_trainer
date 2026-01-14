import React from 'react';
import ResourceManager from '../ui/ResourceManager';
import { robotsTable } from '../db/schema';
import RobotDevicesWizard from './RobotDevicesWizard';

const RobotFields = [
  { name: 'serialNumber', label: 'Serial Number' },
  { name: 'name', label: 'Name' },
  { name: 'model', label: 'Model' },
  { name: 'notes', label: 'Notes' },
];

const RobotsView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager 
        title="Robots" 
        table={robotsTable} 
        renderForm={(props) => <RobotDevicesWizard {...props} />}
      />
    </div>
  );
};

export default RobotsView;
