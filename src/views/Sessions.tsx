import React from 'react';
import ResourceManager from '../ui/ResourceManager';
import { sessionsTable } from '../db/schema';
import SessionForm from './SessionForm';

const SessionsView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager
        title="Sessions"
        table={sessionsTable}
        renderForm={(props) => <SessionForm {...props} />}
      />
    </div>
  );
};

export default SessionsView;
