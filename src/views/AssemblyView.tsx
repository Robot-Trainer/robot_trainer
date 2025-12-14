import React from 'react';
import { ASSEMBLY_STAGES } from '../constants/mockData';
import Button from '../ui/Button';
import { Plus } from '../icons';

export const AssemblyView: React.FC = () => {
  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assembly Lines</h1>
          <p className="text-gray-500">Drag and drop robots to assign tasks</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> New Line</Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {ASSEMBLY_STAGES.map(stage => (
          <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col">
            <div className="p-4 bg-white border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{stage.name}</div>
                <div className="text-sm text-gray-500">{stage.robots.length} robots</div>
              </div>
              <div className="space-y-2">
                {stage.robots.length === 0 && <div className="text-sm text-gray-400">No robots assigned</div>}
                {stage.robots.map(rid => (
                  <div key={rid} className="p-2 border rounded-md bg-gray-50">Robot #{rid}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssemblyView;
