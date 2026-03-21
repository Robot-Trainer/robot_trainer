import React from 'react';
import { Box, Typography } from '@mui/material';
import { ResourceManager, type GridCol } from '../ui/ResourceManager';
import { robotModelsTable, type RobotModelSimProperties } from '../db/schema';
import Badge from '../ui/Badge';

export const robotModelFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'dirName', label: 'Dir Name', required: true },
  { name: 'simProperties', label: 'Sim Properties', defaultValue: '{}', isJson: true },
  { name: 'realProperties', label: 'Real Properties', defaultValue: '{}', isJson: true },
  { name: 'modelXml', label: 'Model XML' },
  { name: 'modelPath', label: 'Model Path' },
  { name: 'modelFormat', label: 'Model Format' },
];

function parseSimProperties(simProperties: unknown): RobotModelSimProperties {
  if (!simProperties) return {};

  if (typeof simProperties === 'string') {
    try {
      return JSON.parse(simProperties) as RobotModelSimProperties;
    } catch {
      return {};
    }
  }

  if (typeof simProperties === 'object') {
    return simProperties as RobotModelSimProperties;
  }

  return {};
}

function getJointCount(props: RobotModelSimProperties): number {
  if (Array.isArray(props.jointNames)) {
    return props.jointNames.length;
  }
  return typeof props.numJoints === 'number' ? props.numJoints : 0;
}

function getActuatorCount(props: RobotModelSimProperties): number {
  return Array.isArray(props.actuatorNames) ? props.actuatorNames.length : 0;
}

const modalityBadgeColor = (modality: string): 'green' | 'blue' | 'gray' => {
  if (modality === 'real') return 'green';
  if (modality === 'simulated') return 'blue';
  return 'gray';
};

const robotModelGridCols: GridCol[] = [
  { field: 'name', headerName: 'Name' },
  {
    field: 'supportedModalities',
    headerName: 'Modality',
    render: (row) => {
      const modalities = Array.isArray(row.supportedModalities)
        ? row.supportedModalities
        : [];

      if (modalities.length === 0) {
        return <Typography color="text.secondary">-</Typography>;
      }

      return (
          modalities.map((modality: string) => (
            <Badge
              key={modality}
              variant="outlined"
              label={modality}
              color={modalityBadgeColor(modality)}
            />
          ))
      );
    },
  },
  {
    field: 'jointCount',
    headerName: 'Joints',
    render: (row) => {
      const props = parseSimProperties(row.simProperties);
      return getJointCount(props);
    },
  },
  {
    field: 'hasGripper',
    headerName: 'Has Gripper',
    render: (row) => {
      const props = parseSimProperties(row.simProperties);
      const hasGripper = props.hasGripper === true;
      return (
        <Badge
          variant="outlined"
          label={hasGripper ? 'Yes' : 'No'}
          color={hasGripper ? 'green' : 'gray'}
        />
      );
    },
  },
  {
    field: 'actuatorCount',
    headerName: 'Actuators',
    render: (row) => {
      const props = parseSimProperties(row.simProperties);
      return getActuatorCount(props);
    },
  },
];

const RobotModelsView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Robot Models"
        table={robotModelsTable}
        fields={robotModelFields}
        gridCols={robotModelGridCols}
      />
    </Box>
  );
};

export default RobotModelsView;
